import * as fs from 'fs';
import * as path from 'path';


export function logFile(service:string,request:any,response:any){

try{
   const logDir = path.join(process.cwd(), 'logs');
    
    if(!(fs.existsSync(logDir))){
        fs.mkdirSync(logDir,{recursive:true});
    }

  const filePath=path.join(logDir,`${service}.json`);

  const logEntry={
    request,
    response
  }

   fs.appendFileSync(filePath,JSON.stringify(logEntry,null,2)+'\n');


}

catch(err){
 
 console.log("error");

}






}