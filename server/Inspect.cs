using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using System.Reflection;
using System.Web.Script.Serialization;
using System.Xml.Linq;
public class Inspect {
 static string TypeName(Type t) {
  if(t.IsByRef) return TypeName(t.GetElementType());
  if(t.IsArray) return TypeName(t.GetElementType())+"[]";
  var aliases=new Dictionary<string,string>{{"System.Void","void"},{"System.String","string"},{"System.Boolean","bool"},{"System.Int32","int"},{"System.Single","float"},{"System.Double","double"},{"System.Object","object"}};
  if(aliases.ContainsKey(t.FullName??""))return aliases[t.FullName];
  if(t.IsGenericType){var name=(t.GetGenericTypeDefinition().FullName??t.Name).Split('`')[0];return name+"<"+string.Join(", ",t.GetGenericArguments().Select(TypeName))+">";}
  return (t.FullName??t.Name).Replace('+','.');
 }
 public static int Main(string[] args) {
  try {
   var dirs=args.Skip(1).Concat(new[]{Path.GetDirectoryName(Path.GetFullPath(args[0]))}).ToArray();
   AppDomain.CurrentDomain.ReflectionOnlyAssemblyResolve+=(s,e)=>{foreach(var dir in dirs){var f=Path.Combine(dir,new AssemblyName(e.Name).Name+".dll");if(File.Exists(f))return Assembly.ReflectionOnlyLoadFrom(f);}return Assembly.ReflectionOnlyLoad(e.Name);};
   var assembly=Assembly.ReflectionOnlyLoadFrom(Path.GetFullPath(args[0]));
   var list=new List<object>();
   Type[] types;try{types=assembly.GetExportedTypes();}catch(ReflectionTypeLoadException e){types=e.Types.Where(t=>t!=null).ToArray();}
   var docs=new Dictionary<string,string>();var xml=Path.ChangeExtension(args[0],".xml");
   if(File.Exists(xml))try{foreach(var m in XDocument.Load(xml).Descendants("member"))docs[(string)m.Attribute("name")]=string.Join(" ",(m.Element("summary")?.Value??"").Split((char[])null,StringSplitOptions.RemoveEmptyEntries));}catch{}
   foreach(var t in types.OrderBy(t=>t.FullName)) {
    if(t.ContainsGenericParameters||t.IsEnum)continue;
    var tn=TypeName(t);
    foreach(var m in t.GetMethods(BindingFlags.Public|BindingFlags.Instance|BindingFlags.Static|BindingFlags.DeclaredOnly)) {
     if(m.IsSpecialName||m.ContainsGenericParameters||m.GetParameters().Any(p=>p.ParameterType.IsByRef||p.ParameterType.IsPointer))continue;
     var key="M:"+t.FullName+"."+m.Name;var doc=docs.FirstOrDefault(d=>d.Key==key||d.Key.StartsWith(key+"(")).Value??"";
     list.Add(new{kind="method",type=tn,name=m.Name,isStatic=m.IsStatic,returnType=TypeName(m.ReturnType),parameters=m.GetParameters().Select(p=>new{name=p.Name,type=TypeName(p.ParameterType),optional=p.IsOptional}).ToArray(),description=doc,assembly=assembly.GetName().Name});
    }
    foreach(var p in t.GetProperties(BindingFlags.Public|BindingFlags.Instance|BindingFlags.Static|BindingFlags.DeclaredOnly)) {
     var g=p.GetGetMethod();if(g==null||p.GetIndexParameters().Length>0)continue;
     string doc;docs.TryGetValue("P:"+t.FullName+"."+p.Name,out doc);
     list.Add(new{kind="property",type=tn,name=p.Name,isStatic=g.IsStatic,returnType=TypeName(p.PropertyType),canWrite=p.GetSetMethod()!=null,parameters=new object[0],description=doc??"",assembly=assembly.GetName().Name});
    }
    foreach(var c in t.GetConstructors()){
     if(c.GetParameters().Any(p=>p.ParameterType.IsByRef||p.ParameterType.IsPointer))continue;
     list.Add(new{kind="constructor",type=tn,name="new "+t.Name,isStatic=true,returnType=tn,parameters=c.GetParameters().Select(p=>new{name=p.Name,type=TypeName(p.ParameterType),optional=p.IsOptional}).ToArray(),description="Create a "+tn+" instance.",assembly=assembly.GetName().Name});
    }
   }
   var json=new JavaScriptSerializer{MaxJsonLength=int.MaxValue};Console.Write(json.Serialize(new{assembly=assembly.GetName().Name,version=assembly.GetName().Version.ToString(),members=list}));return 0;
  }catch(Exception e){Console.Error.WriteLine(e.Message);return 1;}
 }
}
