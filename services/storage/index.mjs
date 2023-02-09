const MONGO_HOST = process.env.MONGO_HOST || 'mongodb://root:root@0.0.0.0:27017'
const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL || 1000)

import {MongoClient} from 'mongodb'

const mongoClient = new MongoClient(MONGO_HOST)
await mongoClient.connect()
const mongoDb = mongoClient.db('what-a-car')
const plates = mongoDb.collection('plates')
await plates.createIndex({plate: 1})
const chats = mongoDb.collection('chats')
await chats.createIndex({chat_id: 1})

import Redis from 'ioredis'

const redisPub = new Redis(REDIS_HOST)
const redisSub = new Redis(REDIS_HOST)
try {
    await redisSub.xgroup('CREATE', 'stream:sravni:resolved', 'storage', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "storage" already exists in stream:sravni:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:autoins:resolved', 'storage', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "storage" already exists in stream:autoins:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:gibdd:resolved', 'storage', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "storage" already exists in stream:gibdd:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:fines:resolved', 'storage', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "storage" already exists in stream:fines:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:plate:requested', 'storage', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "storage" already exists in sstream:plate:requested, skipping')
}

const makeId = length => {
    let result = ''
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const charactersLength = characters.length
    let counter = 0
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
        counter += 1
    }
    return result
}

const flatArrayToObject = arr => {
    const obj = {}
    for (let i = 0; i < arr.length; i += 2) {
        obj[arr[i]] = arr[i + 1] || null
    }
    return obj
}

const hostId = makeId(7)

async function listenForMessages() {
    const results = await redisSub.xreadgroup(
        'GROUP',
        'storage',
        hostId,
        'BLOCK',
        HEARTBEAT_INTERVAL,
        'COUNT',
        10,
        'STREAMS',
        'stream:sravni:resolved',
        'stream:autoins:resolved',
        'stream:gibdd:resolved',
        'stream:fines:resolved',
        'stream:plate:requested',
        '>',
        '>',
        '>',
        '>',
        '>'
    )

    await redisPub.set(`heartbeat:storage:${hostId}`, 1, 'PX', 2 * HEARTBEAT_INTERVAL)
    if(!results?.length){
        return await listenForMessages()
    }

    const flatMessagesPlateRequested = results
        .filter(([stream]) => stream === 'stream:plate:requested')
        .reduce((acc, result) => {
            return acc.concat(result[1])//messages
        }, [])

    for (const message of flatMessagesPlateRequested) {
        const {plate, chat_id, user_id, user_name, user_first_name, user_last_name, user_language_code} = flatArrayToObject(message[1])
        const now = new Date()
        await chats.insertOne({chat_id: parseInt(chat_id), user_id: parseInt(user_id), user_name, user_first_name, user_last_name, user_language_code, request: plate, createdBy: now})
    }

    const flatMessagesResolved = results
        .filter(([stream]) => stream !== 'stream:plate:requested')
        .reduce((acc, result) => {
        return acc.concat(result[1])//messages
    }, [])

    for (const message of flatMessagesResolved) {
        const {key, chat_id, plate} = flatArrayToObject(message[1])
        const [service,] = key.split(':')
        let serviceObj = JSON.parse(await redisPub.call('JSON.GET', key))

        const foundResult = await plates.findOne({plate})
        const now = new Date()

        if (!foundResult) {
            await plates.insertOne({plate, chats: [parseInt(chat_id)], services: {[service]: {...serviceObj, updatedAt: now}}, createdBy: now})
        } else {
            await plates.updateOne({plate}, {
                $addToSet: {
                    chats: parseInt(chat_id)
                },
                $set: {
                    [`services.${service}`]: {...serviceObj, updatedAt: now},
                    updatedAt: now
                }
            })
        }
        console.log({[service]: serviceObj, plate})
    }

    await listenForMessages(/*messages[messages.length - 1][0]*/)
}

listenForMessages()