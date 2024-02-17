require('dotenv').config();
const express  = require("express");
const app  = express();
const mongoose = require('mongoose');
const jwt =  require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
app.use(express.json());
const file = fs.readFileSync('./BDB2110762CAB43918DD30D635E8E24C.txt');
app.use(cors());
// Database connection with mongodb
mongoose.connect(process.env.DB_URL);

// ssl scertificate adding

app.get('/.well-known/pki-validation/BDB2110762CAB43918DD30D635E8E24C.txt',(req,res)=>{
    res.send('hello');
})

// API Creation
app.get('/',(req,res)=>{
    res.send("Express App is Running")
})
// Image Storage Engine

const storage = multer.diskStorage({
    destination:'./upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.filename}_${Date.now()}${path.extname(file.originalname)}`)
    }
}) 

const upload = multer({storage:storage});
// Creating Upload ENdpoint for image
app.use('/images',express.static('upload/images'))
app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        imageUrl:`http://13.60.35.148:${process.env.PORT}/images/${req.file.filename}`
    })
})
//Schema for creating products

const Product = mongoose.model('Product',{
    id:{
        type:Number,
        required:true
    },
    name:{
        type:String,
        required: true
    },
    image:{
        type:String,
        required: true
    },
    category:{
        type:String,
        required: true
    },
    new_price:{
        type:Number,
        required:true
    },
    old_price:{
        type:Number,
        required: true
    },
    date:{
        type:Date,
        default:Date.now
    },
    avilable:{
        type:Boolean,
        default:true
    }
})

app.post('/addproduct',async (req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0){
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    }
    else{
        id = 1
    }
    const product = new Product({

        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price
    });
    console.log(product);
    await product.save();
    console.log("saved");
    res.json({
        success:true,
        name:req.body.name
    });
})

// Creating API for deleting product

app.post('/removeproduct', async (req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name
    });
})

// Creating API for getting all Product

app.get('/allproducts',async (req,res)=>{
    let products = await Product.find({})
    // console.log("all product fetch");
    res.send(products);
})

// Schema creating for user model

const Users = mongoose.model('Users',{
    name:{
        type:String,

    },
    email:{
        type:String,
        unique:true
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
        
    },
    date:{
        type:Date,
        default:Date.now
    }
})

// creating endpoint for registering the user

app.post('/signup',async (req,res)=>{
    console.log(req.body.email)
    let check = await Users.findOne({email:req.body.email})
    
    if(check){
        return res.status(400).json({success:false,errors:"Existing user found with same email address"})

    }
    let cart = {}
    for(let i =0; i <300 ;i++){
        cart[i]= 0;
    }
    
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart

    });
    await user.save();

    const data = {
        user:{
            id:user.id
        }
    }
    const token = jwt.sign(data,'secret_ecom');
    res.json({
        success:true,
        token
    })
})

// Creating Endpoint for user login

app.post('/login', async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,"secret_ecom");
            res.json({
                success:true,
                token
            });
        }
        else{
            res.json({success:false,error:"Wrong password"});
        }
    }
    else{
        res.json({
            success:false,
            errors:"Wrong email Id"
        });
    }
})

// Creating Endpoint for newcollection data

app.get('/newcollections',async (req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("New Collection fetched");
    res.send(newcollection);
})

// Creating endpoint for popular in women section

app.get('/popularinwomen',async (req,res)=>{
    let products = await Product.find({category:"Women"});
    let popular_in_women = products.slice(0,4);
    console.log("Popular in women fetched");
    res.send(popular_in_women);
})

// creating middelware to fetch user

const fetchUser = async (req,res,next) =>{
    const token = req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"Please authenticate using valid token"})
    }
    else{
        try {
            const data = jwt.verify(token,'secret_ecom');
            console.log('middelware data',data.user)
            req.user = data.user;
            
            next();
        } catch (error) {
            res.status(401).send({errors:"Please authenticate using a valid token"})
        }
    }
}

// Creating endpoint for adding product in cartdata
app.post('/addtocart',fetchUser,async (req,res)=>{
    console.log(req.body,req.user);
    let userdata = await Users.findOne({_id:Object(req.user.id)});
    userdata.cartData[req.body.itemid] += 1
    await Users.findOneAndUpdate({_id:Object(req.user.id)},{cartData:userdata.cartData})
    res.send('Added');

})

// Creating Endpoint to remove  product from cartdata

app.post('/removefromcart',fetchUser,async (req,res)=>{
    console.log('removed',req.body.itemid)
    let userdata = await Users.findOne({_id:Object(req.body.id)});
    if(userdata.cartData[req.body.itemid]>0){
        userdata.cartData[req.body.itemid] -= 1
        await Users.findOneAndUpdate({_id:req.body.id},{cartData:userdata.cartData})
        res.send('Removed');
    }
   
    
})

// Creating endpoint to get cartdata
 app.post('/getcart',fetchUser, async (req,res)=>{
    console.log("getcart",req.user);
    let userData = await  Users.findOne({_id:Object(req.user.id)})
    if(userData){
        res.json(userData.cartData);
    }else{
        console.log(userData);
    }
    
 })


app.listen(process.env.PORT,(error)=>{
    if(!error){
        console.log("Sever Running on port :" + process.env.PORT);
    }
    else{
        console.log("Error: "+ error);
    }
})
