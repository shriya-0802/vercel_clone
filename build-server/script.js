const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const mime = require('mime-types')
const Redis= require('ioredis')


 
const publisher=new Redis('')



// const s3Client = new S3Client({
//   region: 'ap-south-1',
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
//   }
// })
const s3Client=new S3Client({
    region:'',
    credentials: {
        accessKeyId: '',
        secretAccessKey: ''
    }
})
const PROJECT_ID = process.env.PROJECT_ID
function publishLog(log){
  publisher.publish(`logs:${PROJECT_ID}`,JSON.stringify({
    log
  }))
}

const PROJECT_ROOT = '/home/app/output'
const DIST_DIR = path.join(PROJECT_ROOT, 'dist')

async function init() {
  console.log('Executing script.js')

  publishLog('Build started...')

  const build = exec(`cd ${PROJECT_ROOT} && npm install && npm run build`)

  build.stdout.on('data', function(data) {
    console.log(data.toString())
    publishLog(data.toString())
  })
  build.stdout.on('error', function(data) {
    console.error('Error', data.toString())
    publishLog(`Error: ${data.toString()}`)
  })

  build.on('close', async (code) => {
    console.log('Build process completed with code:', code)
    publishLog('Build process completed')

    if (!fs.existsSync(DIST_DIR)) {
      console.error('❌ dist folder not found. Build failed.')
      process.exit(1)
    }

    const files = fs.readdirSync(DIST_DIR, { recursive: true })

    publishLog(`Starting to upload`)

    for (const file of files) {
      const filePath = path.join(DIST_DIR, file)
      if (fs.lstatSync(filePath).isDirectory()) continue

      console.log('Uploading:', filePath)
      publishLog(`Uploading: ${file}`)

      const command = new PutObjectCommand({
        Bucket: 'shriya-vercel-clone',
        Key: `__outputs/${PROJECT_ID}/${file}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath) || 'application/octet-stream'
      })

      await s3Client.send(command)
      publishLog(`Uploaded: ${file}`)
      console.log('Uploaded:', filePath)
    }
    publishLog('✅ Done uploading')
    console.log('✅ Done uploading')
  })
}

init()

// const { exec }= require('child_process')
// const path= require('path')
// const fs= require('fs')
// const {S3Client,PutObjectCommand}=require('@aws-sdk/client-s3')
// const mime=require('mime-types')
// const s3Client=new S3Client({
//     region:'ap-south-1',
//     credentials: {
//         accessKeyId: 'AKIAQFHECLIKIUBFOXWR',
//         secretAccessKey: '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'
//     }
// })

// const PROJECT_ID=process.env.PROJECT_ID

// async function init(){
//     console.log('Executing script.js')
//     const outDirPath= path.join(__dirname,'/home/app/output')
//     const p=exec(`cd ${outDirPath} && npm install && npm run build`)
//     p.stdout.on('data', data=>{
//         console.log(data.toString())
//     })
//     p.stdout.on('error', data=>{
//         console.error('Error',data.toString())
//     })
//     p.on('close', async function(){
//         console.log('Build process completed')
//         const distFolderPath= path.join(__dirname,'output','dist')
//         const distFolderContents= fs.readdirSync(distFolderPath,{recursive:true})
//         for(const file of distFolderContents){
//             const filePath= path.join(distFolderPath,file)
//             if(fs.lstatSync(filePath).isDirectory()) continue;

//             console.log('uploading file:',filePath)

//             const command=new PutObjectCommand({
//                 Bucket: 'shriya-vercel-clone',
//                 Key: `__outputs/${PROJECT_ID}/$(filepath)`,
//                 Body: fs.createReadStream(filePath),
//                 ContentType:mime.lookup(filePath)


//     })
//             await s3Client.send(command)
//             console.log('uploaded file:',filePath)


// }
//         console.log('Done...')
//     })
// }
// init()