var express = require('express');
var router = express.Router();
const UIDGenerator = require('uid-generator');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId; 
const uidgen = new UIDGenerator();
const base64 = require('node-base64-image');
const path = require('path')
const fs = require('fs')

let tokens = []

function lookUpToken(token)
{
  console.log(tokens)
  for(tokendata of tokens)
  {
    if(tokendata.token == token) return tokendata;
  }
  return {}
}

async function isParticipant(eventid, userid)
{
  let result = await queryMongoDB("events", {_id: ObjectId(eventid)})
  for(let person of result[0].attendants)
  {
    let userid_str = String(person.userid)
    console.log("1:" + userid_str + " 2:" + userid)
    console.log(userid_str == userid)
    if(userid_str == userid) return true
  }
  return false
}

async function checkIfVoted(eventid, userid)
{
  let result = await queryMongoDB("events", {_id: ObjectId(eventid)})
  let userid_str = String(userid)
  return result[0].voting.voted.includes(userid_str)
}

let eventsTemplate = 
[
  {
    name: "title",
    required: true,
    type: "String"
  },
  {
    name: "timestamp",
    required: false,
    type: "TimeString"
  }
]

let userTemplate = 
[
  {
    name: "username",
    required: true,
    type: "String"
  },
  {
    name: "password",
    required: true,
    type: "String"
  },
  {
    name: "fullname",
    required: true,
    type: "String"
  },
  {
    name: "vaccinated",
    required: false,
    type: "Boolean"
  }
]

async function queryMongoDB(collectionName, query = {}) {
  const uri = "mongodb+srv://Express:jYE57Zx0MdDh654t@groupupcluster.m4dxg.mongodb.net/groupup?retryWrites=true&w=majority";
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const collection = client.db("groupup").collection(collectionName);
  let jsonresult = null;
  jsonresult = await collection.find(query).toArray()
  await client.close();
  return jsonresult
}

async function insertMongoDB(collectionName, json) {
  const uri = "mongodb+srv://Express:jYE57Zx0MdDh654t@groupupcluster.m4dxg.mongodb.net/groupup?retryWrites=true&w=majority";
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const collection = client.db("groupup").collection(collectionName);
  let jsonresult = null;
  jsonresult = await collection.insertOne(json)
  await client.close();
  return jsonresult.insertedId
}

async function updateMongoDB(collectionName, queryJson, updateJson) {
  const uri = "mongodb+srv://Express:jYE57Zx0MdDh654t@groupupcluster.m4dxg.mongodb.net/groupup?retryWrites=true&w=majority";
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const collection = client.db("groupup").collection(collectionName);
  let result = await collection.update(queryJson, updateJson)
  console.log(result)
  await client.close();
  return result
}

async function otherUpdateMongoDB(collectionName, queryJson, updateJson, filterJson) {
  const uri = "mongodb+srv://Express:jYE57Zx0MdDh654t@groupupcluster.m4dxg.mongodb.net/groupup?retryWrites=true&w=majority";
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const collection = client.db("groupup").collection(collectionName);
  console.log(updateJson)
  await collection.updateMany(queryJson, updateJson, filterJson)
  await client.close();
  console.log("Update completed")
  return
}

function verifyTemplateIntegrity(template, json)
{
  for(templateValue of template)
  {
    console.log(templateValue)
    if(templateValue.required)
    {
      if((templateValue.name in json) == false) return false
      if(json[templateValue.name] == "" || json[templateValue.name] == null || json[templateValue.name] == undefined) return false
    }

    /*if(json[templateValue.name])
    {
      switch(templateValue.type)
      {
        case "String":
          if((typeof json[templateValue.name] == 'string') == false) return false
        case "TimeString":
          if((typeof json[templateValue.name] == 'string') == false) return false
        case "Boolean":
          if((json[templateValue.name] instanceof Boolean) == false) return false
      }
    }*/
  }
  return true
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.send("hello")
});

//query all users
router.get('/users', async function(req, res) {
  let result = await queryMongoDB("users")
  res.status(200).json(result);
});

router.get('/events', async function(req, res) {
  let result = await queryMongoDB("events")
  res.status(200).json(result);
});

//get user data of attendants
// {list: []}
router.post('/users/attendants', async function(req, res) {
  json = req.body
  for(let i = 0; i < json.list.length; i++) json.list[i] = ObjectId(json.list[i])
  let result = await queryMongoDB("users", { _id: { $in: json.list}})
  for(let person of result) delete person["password"]
  res.status(200).json(result);
});

//query event with id
router.get('/events/:eventid', async function(req, res) {
  let result = await queryMongoDB("events", {_id: ObjectId(req.params.eventid)})
  res.status(200).json(result);
});

//insert event
//{"title":"Test Event","timestamp":"2021-06-06T14:38:04+00:00"}
router.put('/events', async function(req, res) {
  res.status(501).send("Not yet available")
  //json = req.body
  //let result = await insertMongoDB("users", json)
  //res.status(200).json(result);
});

//query who has this token
router.get('/who/:token', async function(req, res) {
  let result = lookUpToken(req.params.token)
  res.status(200).json(result);
});

//preview
router.get('/preview/:eventid', async function(req, res) {
  let result = await queryMongoDB("previews", {eventid: req.params.eventid})
  console.log(result[0].base64)
  await base64.decode(result[0].base64, { fname: 'decoded', ext: 'jpg' });
  res.status(200).sendFile(path.join(__dirname,'../decoded.jpg'))
  fs.unlink(path.join(__dirname,'../decoded.jpg'))
});

//users obj
router.put('/users', async function(req, res) {
  json = req.body
  console.log(verifyTemplateIntegrity(userTemplate, json))
  if(!verifyTemplateIntegrity(userTemplate, json))
  {
    res.status(400).json({success: false, error: "Error: Bad Request"})
    return
  }
  let result = await insertMongoDB("users", json)
  let gentoken = await uidgen.generate()
  tokens.push({username: json.username, token: gentoken, userid: result})
  res.status(201).json({success: true, token: gentoken});
});

//{token : "token", property: {<prop>: "vmi"}}
router.patch('/users', async function(req, res) {
  json = req.body
  console.log(json)
  if(lookUpToken(json.token) == {})
  {
    res.status(401).send("Unauthorized")
    return
  }
  else userid = lookUpToken(json.token).userid
  let result = await updateMongoDB("users", {_id: ObjectId(userid)}, {$set: json.property})
  if(result.result.ok == 1) res.status(204).send();
  else res.status(400).send("Update failed");
});

//
//{username, password}
router.post('/auth', async function(req, res) {
  json = req.body
  console.log(json)
  if(!json.username || !json.password) res.status(400).send({auth: false, error: "Invalid request"})
  let result = await queryMongoDB("users", {username: json.username})
  if(result[0].password == json.password)
  {
    let gentoken = await uidgen.generate()
    tokens.push({username: result[0].username, token: gentoken, userid: result[0]._id})
    res.status(200).json({auth: true, token: gentoken});
  }
  else res.status(401).json({auth: false, error: "Invalid password"})
});

//{token, eventid, response}
router.post('/respond', async function(req, res) {
  json = req.body
  if(lookUpToken(json.token) == {})
  {
    res.status(401).send("Unauthorized")
    return
  }
  else userid = lookUpToken(json.token).userid
  let isParticip = await isParticipant(json.eventid, userid)
  if(isParticip == true) {
    console.log("Is participant - updating resp")
    await otherUpdateMongoDB("events", {_id: ObjectId(json.eventid)}, { $set: { "attendants.$[person].response": json.response } },
    { arrayFilters: [  { "person.userid": ObjectId(userid) } ], multi: true})
  }
  else
  {
    console.log("Not participant - adding")
    await otherUpdateMongoDB("events", {_id: ObjectId(json.eventid)}, { $push: { attendants: {userid: ObjectId(userid), response: json.response} } })
  }
  res.status(204).json();
});

//{token, eventid, index}
router.post('/vote', async function(req, res) {
  json = req.body
  if(lookUpToken(json.token) == {})
  {
    res.status(401).send("Unauthorized")
    return
  }
  else userid = lookUpToken(json.token).userid
  let keyName = "voting.replies." + json.index  + ".votes"
  if(await checkIfVoted(json.eventid, userid) == true)
  {
    res.status(403).send("Already voted")
    return
  }
  await otherUpdateMongoDB("events", {_id: ObjectId(json.eventid)}, { $inc: { [keyName]: 1 }, $push: {"voting.voted": String(userid)} }, null)
  res.status(204).json();
});

//
//invalidate user token
// {token}
router.post('/logout', async function(req, res) {
  json = req.body
  for(let i = 0; i < tokens.length; i++)
  {
    if(tokens[i].token = json.token)
    {
      delete tokens[i]
      tokens = tokens.filter(e => e != null)
      break
    }
  }
  console.log(tokens)
  res.status(204).send()
});



module.exports = router;
