const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    //await client.connect();

    const featuredCollection = client.db('featuredDB').collection('featured');


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
 
    app.post('/addFood', async(req, res) =>{
        const foodData = req.body;
        console.log(foodData)
        const result = await featuredCollection.insertOne(foodData);
        res.send(result);
    })
    app.get('/foods/:email', async(req, res) =>{
        const email = req.params.email
        const query = {donatorEmail : email}
        const result = await featuredCollection.find(query).toArray()
        res.send(result)
    })
    app.delete('/food/:id', async(req, res) =>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await featuredCollection.deleteOne(query)
        res.send(result);
    })
    
    app.put('/food/:id', async (req, res) => {
        const id = req.params.id;
        const foodData = req.body;
    
        // Extract _id from the foodData to prevent modifying it
        const { _id, ...updatedData } = foodData;
    
        const query = { _id: new ObjectId(id) };
        const options = { upsert: true };
        const updateDoc = {
            $set: updatedData, // Use the updated data without _id
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
        // Update the food status to "Requested"
        const query = { _id: new ObjectId(id) };
        const updateDoc = {
            $set: {
                foodStatus: 'Requested'
            }
        };
        const result = await featuredCollection.updateOne(query, updateDoc);
        res.send(result);
});

    
    app.get('/requested/:email', async(req, res) =>{
        const email = req.params.email
        const query = {donatorEmail : email}
        const result = await featuredCollection.find(query).toArray()
        res.send(result)
    })


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