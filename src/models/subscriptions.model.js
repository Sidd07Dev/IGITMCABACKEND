
import mongoose ,{Schema} from "mongoose";

const subscriptionsSchema = new Schema({
    subscriber:{
        type:Schema.Types.ObjectId, // One who is subscribing
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId, // One to whome Subscriber  is subscribing
        ref:"User"
    }
},{timestamps:true})

export const Subscription = mongoose.model("Subscription",subscriptionsSchema)