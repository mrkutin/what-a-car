const STREAM = 'stream:vin_requested'

const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'

import Redis from 'ioredis'

const redisPub = new Redis(REDIS_HOST)
const redisSub = new Redis(REDIS_HOST)
try {
    await redisSub.xgroup('CREATE', STREAM, 'gibdd', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "gibdd" already exists, skipping')
}

import {getHistoryByVin} from './getHistoryByVin.mjs'
import {getAccidentsByVin} from './getAccidentsByVin.mjs'
import {getWantedByVin} from './getWantedByVin.mjs'
import {getRestrictionsByVin} from './getRestrictionsByVin.mjs'
import {getDiagnosticCardsByVin} from './getDiagnosticCardsByVin.mjs'

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

async function listenForMessages(/*lastId = '$'*/) {
    const results = await redisSub.xreadgroup('GROUP', 'gibdd', makeId(7), 'BLOCK', '0', 'COUNT', '1', 'STREAMS', STREAM, '>')
    const [stream, messages] = results[0]; // `key` equals to 'plate_requested'

    const promises = messages.map(async message => {
        const messageObj = flatArrayToObject(message[1])
        if (messageObj.vin) {
            const key = `gibdd:${messageObj.vin}`
            let value = JSON.parse(await redisPub.call('JSON.GET', key))
            if (!value) {
                value = await getHistoryByVin(messageObj.vin)
                await redisPub.call('JSON.SET', key, '$', JSON.stringify(value))
                //todo expire
            }
            await redisPub.xadd('stream:vin_resolved', '*', 'key', key, 'chat_id', messageObj.chat_id)
        }
    })
    await Promise.all(promises)

    await listenForMessages(/*messages[messages.length - 1][0]*/)
}

listenForMessages()

// fastify.route({
//     method: 'GET',
//     url: '/',
//     handler: async () => {
//         return 'GIBDD'
//     }
// })
//
// fastify.route({
//     method: 'GET',
//     url: '/vins/:vin',
//     handler: async (req) => {
//         const vin = req.params.vin
//
//         const history = await getHistoryByVin(vin)
//         if(!history){
//             return null
//         }
//
//         const accidents = await getAccidentsByVin(vin)
//         const wanted = await getWantedByVin(vin)
//         const restrictions = await getRestrictionsByVin(vin)
//         const diagnosticCards = await getDiagnosticCardsByVin(vin)
//
//         return {...history, accidents, wanted, restrictions, diagnosticCards}
//     }
// })
//
// const startHTTPServer = async () => {
//     try {
//         await fastify.listen({
//             host: '0.0.0.0',
//             port: 8090
//         })
//     } catch (err) {
//         fastify.log.error(err)
//         process.exit(1)
//     }
// }
//
// startHTTPServer()