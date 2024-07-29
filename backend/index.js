require('dotenv').config();

const port = process.env.PORT;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { type } = require("os");
const { error } = require("console");

app.use(express.json({limit : 52428800}))
/*
const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true,parameterLimit: 1000000,limit: '500mb'}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
*/
//app.use(express.json());
app.use(cors());

// Database Connection with MongoDb
mongoose.connect(process.env.MONGO_URL)


//API Creation

app.get("/",(req,res)=>{
    res.send("Express App is Running")
})


//image storage Engine

const storage = multer.diskStorage({
    destination: './upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})

// Creating upload  Endpoint for images
app.use('/images',express.static('upload/images'))

app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})


// schema for creating  products (Courses)

const Product = mongoose.model("Product",{
    id:{
        type: Number,
        required:true,
    },

    image:{
        type: String,
        required:false,
    },

    Product_image:{
        type: String,
        required:false,
    },

    product_details:{
        type: String,
        required:true,
    },

    owner_logo:{
        type: String,
        required:false,
    },

    category:{
        type: String,
        required:true,
    },

    owner_name:{
        type: String,
        required:true,
    },
    
    course_name:{
        type: String,
        required:true,
    },

    course_level:{
        type: String,
        required:true,
    },

    price:{
        type: Number,
        required:true,
    },

    date:{
        type: Date,
        default: Date.now,
    },

    avilable:{
        type: Boolean,
        default: true,
    },
})

app.post('/addproduct',async (req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0){
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id+1;
    }
    else{
        id=1;
    }

    const product = new Product({
        id:id,
        image:req.body.image,
        Product_image:req.body.Product_image,
        product_details:req.body.product_details,
        owner_logo:req.body.owner_logo,
        category:req.body.category,
        owner_name:req.body.owner_name,
        course_name:req.body.course_name,
        course_level:req.body.course_level,
        price:req.body.price,
    })
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success:true,
        course_name:req.body.course_name,
    })
})

// Creating API for deleting product

app.post('/removeproduct' , async (req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        course_name:req.body.course_name,
    })
})

// Creating API for getting all products
app.get('/allproducts', async (req,res)=>{
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})


// scema creating for user model

const Users = mongoose.model('Users',{
    name:{
        type: String, 
    },
    email:{
        type: String,
        unique:true,
    },
    password:{
        type: String,
    },
    cartData:{
        type: Object,
    },
    date:{
        type: Date,
        default: Date.now,
    }
})

// Creating Endpoint for registering the user
app.post('/signup', async (req,res)=>{

    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({success:false,errors:"existing user found with same email address"})
    }
    let cart ={};
    for (let i = 0; i < 300; i++) {
        cart[i]=0;   
    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })

    await user.save();

    //JWT Token Generation

    const data = {
        user:{
            id:user.id
        }
    }

    const token = jwt.sign(data,process.env.SECRET_KEY);
    res.json({success:true,token})
})

// creating endpoint for login
app.post('/login', async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if (user) {
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,process.env.SECRET_KEY);
            res.json({success:true,token})
        }
        else{
            res.json({success:false,errors:"Wrong Password"});
        }
    }
    else{
        res.json({success:false,errors:"Wrong Email Id"});
    }
})

// creating endpoint for newcollection data
app.get('/newcollections', async (req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("New Collection Fetched");
    res.send(newcollection);
})

// creating endpoint for popular data
app.get('/popular', async (req,res) => {
    let products = await Product.find({});
    let popular = products.slice(0,8);
    console.log("Popular Fetched");
    res.send(popular);
})

// creating middleware to fetch user
const fetchUser = async (req,res,next)=>{
    const token = req.header('auth-token'); 
    if (!token) {
        res.status(401).send({errors:"Please authenticate using a valid token"})
    }
    else{
        try{
            const data = jwt.verify(token,process.env.SECRET_KEY);
            req.user = data.user;
            next();
        } catch(error){
            res.status(401).send({errors:"Please authenticate using a valid token"})
        }

    }
}

// creating endpoint for adding products to cartdata
app.post('/addtocart', fetchUser,async (req,res)=>{
    /*console.log(req.body,req.user);*/

    console.log("Added",req.body.itemId);
    // using user id find the user
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added")
})


// creating endpoint to remove product from cartdata
app.post('/removefromcart',fetchUser, async (req,res)=>{

    console.log("removed",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed")
})

// creating endpoint  to get cartdata (retreive cartdata when login)
app.post('/getcart',fetchUser, async (req,res)=>{
    console.log("GetCart");
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})


app.listen(port,(error)=>{
    if (!error) {
        console.log("server Running on Port "+ port)
        
    }
    else{
        console.log("Error : "+error)
    }
})