const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'
const REDIS_EXPIRATION_SEC = parseInt(process.env.REDIS_EXPIRATION_SEC || (3600 * 24 * 7)) // 1 week
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || 1000)

import Redis from 'ioredis'

const redisPub = new Redis(REDIS_HOST)
const redisSub = new Redis(REDIS_HOST)

try {
    await redisSub.xgroup('CREATE', 'stream:vin:resolved', 'gibdd', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "gibdd" already exists in stream:vin:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:sts:resolved', 'gibdd', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "gibdd" already exists in stream:sts:resolved, skipping')
}

import {getHistoryByVin} from './getHistoryByVin.mjs'
import {getAccidentsByVin} from './getAccidentsByVin.mjs'
import {getWantedByVin} from './getWantedByVin.mjs'
import {getRestrictionsByVin} from './getRestrictionsByVin.mjs'
import {getDiagnosticCardsByVin} from './getDiagnosticCardsByVin.mjs'
import {getFinesByPlateAndSts} from './getFinesByPlateAndSts.mjs'

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

async function listenForMessages(/*lastId = '$'*/) {
    const results = await redisSub.xreadgroup(
        'GROUP',
        'gibdd',
        hostId,
        'BLOCK',
        HEARTBEAT_INTERVAL_MS,
        'COUNT',
        1,
        'STREAMS',
        'stream:vin:resolved',
        'stream:sts:resolved',
        '>',
        '>')

    await redisPub.set(`heartbeat:gibdd:${hostId}`, 1, 'PX', 2 * HEARTBEAT_INTERVAL_MS)
    if(!results?.length){
        return await listenForMessages()
    }

    //only messages with STS
    const flatMessagesWithSts = results
        .filter(([stream]) => ['stream:sts:resolved'].includes(stream))
        .reduce((acc, result) => {
            return acc.concat(result[1])//messages
        }, [])
    for (const message of flatMessagesWithSts) {
        const {sts, chat_id, plate} = flatArrayToObject(message[1])
        const chatSettings = JSON.parse(await redisPub.call('JSON.GET', `chat:${chat_id}`))

        if(plate && sts){
            const key = `fines:${plate}:${sts}`
            const value = JSON.parse(await redisPub.call('JSON.GET', key))
            if (!value || chatSettings?.cache === false) {
                const fines = await getFinesByPlateAndSts(plate, sts)
                await redisPub.call('JSON.SET', key, '$', JSON.stringify({fines}))
                await redisPub.expire(key, REDIS_EXPIRATION_SEC)
            }
            await redisPub.xadd('stream:fines:resolved', '*', 'key', key, 'chat_id', chat_id, 'plate', plate)
        }
    }

    //only messages with VIN
    const flatMessagesWithVin = results
        .filter(([stream]) => ['stream:vin:resolved'].includes(stream))
        .reduce((acc, result) => {
            return acc.concat(result[1])//messages
        }, [])
    for (const message of flatMessagesWithVin) {
        const {vin, chat_id, plate} = flatArrayToObject(message[1])
        const chatSettings = JSON.parse(await redisPub.call('JSON.GET', `chat:${chat_id}`))

        if (vin) {
            const key = `gibdd:${vin}`
            let value = JSON.parse(await redisPub.call('JSON.GET', key))
            if (!value || chatSettings?.cache === false) {
                const history = await getHistoryByVin(vin)
                const accidents = await getAccidentsByVin(vin)
                const wanted = await getWantedByVin(vin)
                const restrictions = await getRestrictionsByVin(vin)
                const diagnosticCards = await getDiagnosticCardsByVin(vin)
                const res = {...history, accidents, wanted, restrictions, diagnosticCards}

                await redisPub.call('JSON.SET', key, '$', JSON.stringify(res))
                await redisPub.expire(key, REDIS_EXPIRATION_SEC)
            }
            await redisPub.xadd('stream:gibdd:resolved', '*', 'key', key, 'chat_id', chat_id, 'plate', plate)
        }
    }

    //setTimeout(listenForMessages, 100)
    await listenForMessages()
}

listenForMessages()
