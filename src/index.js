// require('dotenv').config({path:'./env'})
import dotenv from 'dotenv';
import app from "./app.js";
import connectDB from "./db/index.js";
import express from 'express';

const port=process.env.PORT || 3000;

dotenv.config({
  path: './env'
})

connectDB()
  .then(() => {
    app.listen(port,()=>{
      console.log(`o App running on port :${port}`)
  })
  })
  .catch((err) => {
    console.log(`MongoDb database connect error `, err);

  })










/*
import express from 'express';
const app=express();
;(async ()=>{
    try{
      await  mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
      app.on('erroir',(error)=>{
        console.log("erroe:",error)
        throw error
      })
      app.listen(process.env.PORT,()=>{
        console.log(`App running on port:${process.env.PORT}`)
      })
    }catch (error){
        console.log("ERROR:",error)
        
    }
})()
*/