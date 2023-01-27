import {createClient} from 'redis'

const redisClient = createClient()
const redisSubscriber = redisClient.duplicate()

import {MongoClient} from 'mongodb'

const url = `mongodb://root:root@localhost:27017`
const mongoClient = new MongoClient(url)
const mongoDbName = 'what-a-car'
await mongoClient.connect()
const mongoDb = mongoClient.db(mongoDbName)
const collection = mongoDb.collection('plates')

await redisClient.connect()
redisClient.on('error', (err) => console.log('Redis Client Error', err))
await redisSubscriber.connect()
redisSubscriber.on('error', (err) => console.log('Redis Subscriber Error', err))

await redisSubscriber.pSubscribe('__keyevent*__:*', async (key) => {
    console.time('upsert')
    const [service, plate] = key.split(':')
    const value = await redisClient.json.get(key)
    const foundResult = await collection.findOne({plate})

    const now = new Date()
    if(!foundResult){
        await collection.insertOne({plate, services: {[service]: {...value, updatedAt: now}}, createdBy: now})
    } else {
        await collection.updateOne({plate}, {$set: {[`services.${service}`]: {...value, updatedAt: now}, updatedAt: now}})
    }
    console.timeEnd('upsert')
})
