const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors({
    origin: ['http://localhost:5174'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

console.log(process.env.DB_PASS)


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8bgsx7j.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// middlewares
// const logger = async(req, res, next) =>{
//     console.log('called', req.host, req.originalUrl)
//     next();
// }
const verifyToken = async(req, res, next) =>{
    const token = req.cookies.token;
    console.log('value of token', token);
    if(!token){
        return res.status(401).send({message: 'forbidden'});
    }
    next();
}


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();

    const featuredCollection = client.db('featuredDB').collection('featured');
    const requestedCollection = client.db('requestedDB').collection('requested');

    //Auth related api
     app.post('/jwt', async(req, res) =>{
        const user = req.body;
        console.log(user);
        const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
        res
        .cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'none'
        })
        .send({success: true})
     });

    //services related api
    app.get('/featured-foods', async (req, res) => {
            const featuredFoods = await featuredCollection.find().sort({ foodQuantity: -1 }).toArray();
            res.json(featuredFoods);
           });

    app.get('/food/:id', async(req,res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await featuredCollection.findOne(query)
        res.send(result);
    })
 
    app.post('/addFood', async(req, res) => {
        const foodData = req.body;
        const foodDataWithMetadata = { ...foodData, addedBy: 'AddFood' };
    
        try {
            const result = await featuredCollection.insertOne(foodDataWithMetadata);
            res.send(result);
        } catch (error) {
            console.error('Error adding food:', error);
            res.status(500).send('Internal Server Error');
        }
    });
    
    app.get('/foods/:email', async(req, res) => {
        try {
            const email = req.params.email;
            const query = { donatorEmail: email, addedBy: 'AddFood' }; 
            const result = await featuredCollection.find(query).toArray();
            res.send(result);
        } catch (error) {
            console.error('Error fetching foods:', error);
            res.status(500).send('Internal Server Error');
        }
    });

    app.delete('/food/:id', async(req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await featuredCollection.deleteOne(query)
        res.send(result);
    })
    
    app.put('/food/:id', async (req, res) => {
        const id = req.params.id;
        const foodData = req.body;
        const { _id, ...updatedData } = foodData;
    
        const query = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
            $set: updatedData, 
        };
    
        try {
            const result = await featuredCollection.updateOne(query, updateDoc, options);
            res.send(result);
        } catch (error) {
            console.error('Error updating food:', error);
            res.status(500).send('Internal Server Error');
        }
    });



    app.put('/food/:id/request', async (req, res) => {
        const id = req.params.id;
        const { additionalNotes } = req.body;
        const { donatorEmail } = req.body;
        const {requestDate} = req.body;
        try {
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    foodStatus: 'Requested',
                    additionalNotes: additionalNotes,
                    donatorEmail : donatorEmail,
                    requestDate : requestDate,
                }
            };
            const result = await featuredCollection.updateOne(query, updateDoc);
            const requestedFood = await featuredCollection.findOne(query);
            if (!requestedFood) {
                throw new Error('Food not found');
            }
            const requestedData = {
                ...requestedFood,
                donatorEmail: requestedFood.donatorEmail 
            };
            delete requestedData._id; 
            const insertResult = await requestedCollection.insertOne(requestedData);
    
            res.json({ result, insertResult });
        } catch (error) {
            console.error('Error requesting food:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
    
    app.get('/requested-foods/:email', async (req, res) => {
        try {
            const email = req.params.email;
            const query = { donatorEmail : email };
            const requestedFoods = await requestedCollection.find(query).toArray();
            res.json(requestedFoods);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
    

app.put('/food/:id', async (req, res) => {
    const id = req.params.id;
    const additionalNotes = req.body.additionalNotes;

    const query = { _id: new ObjectId(id) };
    const updateDoc = {
        $set: {
            additionalNotes: additionalNotes,
        }
    };

    try {
        const result = await featuredCollection.updateOne(query, updateDoc);
        res.send(result);
    } catch (error) {
        console.error('Error updating food:', error);
        res.status(500).send('Internal Server Error');
    }
});


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res) =>{
res.send('food server is running')
})

app.listen(port, ()=>{
    console.log(`Food server is running on port: ${port}`)
})