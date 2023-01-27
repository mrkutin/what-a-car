import {createClient} from 'redis'

const redisClient = createClient()
const redisSubscriber = redisClient.duplicate()

import {MongoClient} from 'mongodb'

const url = `mongodb://root:root@localhost:27017`
const mongoClient = new MongoClient(url)
const mongoDbName = 'auto-info'
await mongoClient.connect()
const mongoDb = mongoClient.db(mongoDbName)
const collection = mongoDb.collection('cars')

await redisClient.connect()
redisClient.on('error', (err) => console.log('Redis Client Error', err))
await redisSubscriber.connect()
redisSubscriber.on('error', (err) => console.log('Redis Subscriber Error', err))

await redisSubscriber.pSubscribe('__keyevent*__:*', async (vin) => {
    console.time('upsert')
    const json = await redisClient.json.get(vin)

    const findResult = await collection.findOne({vin})
    if(!findResult){
        await collection.insertOne({vin, ...json, createdAt: new Date()})
    } else {
        await collection.updateOne({vin}, {$set: {...json, updatedAt: new Date()}})
    }

    console.log(json)
    console.timeEnd('upsert')
})
