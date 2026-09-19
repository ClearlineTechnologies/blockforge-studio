using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
static class Launcher {
 static bool Ready(){try{var r=(HttpWebRequest)WebRequest.Create("http://127.0.0.1:4173/api/status");r.Timeout=1000;using(var response=r.GetResponse())using(var reader=new StreamReader(response.GetResponseStream()))return reader.ReadToEnd().Contains("blockforge-studio");}catch{return false;}}
 [STAThread] static void Main(){
  var root=Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
  try {
   if(!Ready()){
    var node=Path.Combine(root,"runtime","node.exe");if(!File.Exists(node))throw new Exception("The bundled Node runtime is missing. Keep BlockForge.exe inside the complete BlockForge folder.");
    if(!File.Exists(Path.Combine(root,"dist","index.html")))throw new Exception("The production interface is missing. Build the app with npm run build.");
    var start=new ProcessStartInfo(node,"\""+Path.Combine(root,"server","index.mjs")+"\" --production"){WorkingDirectory=root,UseShellExecute=false,CreateNoWindow=true,WindowStyle=ProcessWindowStyle.Hidden};
    var server=Process.Start(start);bool ready=false;for(int i=0;i<60;i++){Thread.Sleep(250);if(Ready()){ready=true;break;}if(server.HasExited)break;}
    if(!ready)throw new Exception("The local server could not start on port 4173. Another application may be using it. See README.md for manual startup instructions.");
   }
   var chrome=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),"Google","Chrome","Application","chrome.exe");
   var edge=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86),"Microsoft","Edge","Application","msedge.exe");
   var browser=File.Exists(chrome)?chrome:File.Exists(edge)?edge:null;
   if(browser!=null)Process.Start(new ProcessStartInfo(browser,"--app=http://127.0.0.1:4173 --new-window"){UseShellExecute=true});
   else Process.Start(new ProcessStartInfo("http://127.0.0.1:4173"){UseShellExecute=true});
  }catch(Exception e){MessageBox.Show(e.Message,"BlockForge Studio",MessageBoxButtons.OK,MessageBoxIcon.Error);}
 }
}
