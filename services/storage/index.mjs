const MONGO_HOST = process.env.MONGO_HOST || 'mongodb://root:root@0.0.0.0:27017'
const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'

import {createClient} from 'redis'

const redisClient = createClient()
const redisSubscriber = redisClient.duplicate()

import {MongoClient} from 'mongodb'
const mongoClient = new MongoClient(MONGO_HOST)
await mongoClient.connect()
const mongoDb = mongoClient.db('what-a-car')
const collection = mongoDb.collection('plates')
await collection.createIndex({plate: 1})

await redisClient.connect({
    url: REDIS_HOST
})
redisClient.on('error', (err) => console.log('Redis Client Error', err))
await redisSubscriber.connect({
    url: REDIS_HOST
})
redisSubscriber.on('error', (err) => console.log('Redis Subscriber Error', err))

await redisSubscriber.pSubscribe('__keyevent*__:*', async (key) => {
    // console.time('upsert')
    const [service, plate] = key.split(':')
    const value = await redisClient.json.get(key)
    const foundResult = await collection.findOne({plate})

    const now = new Date()
    if (!foundResult) {
        await collection.insertOne({plate, services: {[service]: {...value, updatedAt: now}}, createdBy: now})
    } else {
        await collection.updateOne({plate}, {
            $set: {
                [`services.${service}`]: {...value, updatedAt: now},
                updatedAt: now
            }
        })
    }
    // console.timeEnd('upsert')
})
