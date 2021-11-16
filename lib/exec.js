import {exec} from 'child_process';

async function execAsync(cmd, args={}) {
  if( !args.shells ) args.shell = '/bin/bash';
  return new Promise((resolve, reject) => {
    exec(cmd, args, (error, stdout, stderr) => {
      if( error ) reject(error);
      else resolve({stdout, stderr});
    })
  });
}

export default execAsync;