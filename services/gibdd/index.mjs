const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'
const REDIS_EXPIRATION_SEC = parseInt(process.env.REDIS_EXPIRATION_SEC || (3600 * 24 * 7)) // 1 week
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL || 1000)

import Redis from 'ioredis'

const redisPub = new Redis(REDIS_HOST)
const redisSub = new Redis(REDIS_HOST)

try {
    await redisSub.xgroup('CREATE', 'stream:sravni:resolved', 'gibdd', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "gibdd" already exists in stream:sravni:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:autoins:resolved', 'gibdd', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "gibdd" already exists in stream:autoins:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:ingos:resolved', 'gibdd', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "gibdd" already exists in stream:ingos:resolved, skipping')
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
        HEARTBEAT_INTERVAL,
        'COUNT',
        1,
        'STREAMS',
        'stream:sravni:resolved',
        'stream:autoins:resolved',
        'stream:ingos:resolved',
        '>',
        '>',
        '>')

    await redisPub.set(`heartbeat:gibdd:${hostId}`, 1, 'PX', 2 * HEARTBEAT_INTERVAL)
    if(!results?.length){
        return await listenForMessages()
    }

    //only messages with STS
    const flatMessagesWithSts = results
        .filter(([stream]) => ['stream:sravni:resolved', 'stream:ingos:resolved'].includes(stream))
        .reduce((acc, result) => {
            return acc.concat(result[1])//messages
        }, [])
    for (const message of flatMessagesWithSts) {
        const {key, chat_id, plate} = flatArrayToObject(message[1])
        const chatSettings = JSON.parse(await redisPub.call('JSON.GET', `chat:${chat_id}`))
        const messageObj = JSON.parse(await redisPub.call('JSON.GET', key))//object with vin field
        const [service, ] = key.split(':')

        let sts = null
        if(service === 'sravni' && messageObj?.carDocument?.series && messageObj?.carDocument?.number) {
            sts = `${messageObj.carDocument.series}${messageObj.carDocument.number}`
        }
        if(service === 'ingos' && messageObj?.documents?.length) {
            sts = messageObj.documents.find(doc => doc.type.name === 'СТС')?.number
        }

        if(sts){
            const key = `fines:${plate}:${sts}`

            //debounce
            const history = await redisPub.xrevrange('stream:fines:resolved', '+', Date.now() - 10000, 'COUNT', '100')
            const idx = history.findIndex(message => {
                const {key: history_key, chat_id: history_chat_id} = flatArrayToObject(message[1])
                return key === history_key && chat_id === history_chat_id
            })
            if (idx === -1) {
                const value = JSON.parse(await redisPub.call('JSON.GET', key))
                if (!value || chatSettings?.cache === false) {
                    const fines = await getFinesByPlateAndSts(plate, sts)
                    await redisPub.call('JSON.SET', key, '$', JSON.stringify({fines}))
                    await redisPub.expire(key, REDIS_EXPIRATION_SEC)
                }
                await redisPub.xadd('stream:fines:resolved', '*', 'key', key, 'chat_id', chat_id, 'plate', plate)
            }
        }
    }

    //all messages including these with SMS
    const flatMessages = results
        .reduce((acc, result) => {
            return acc.concat(result[1])//messages
        }, [])
    for (const message of flatMessages) {
        const {key, chat_id, plate} = flatArrayToObject(message[1])
        const chatSettings = JSON.parse(await redisPub.call('JSON.GET', `chat:${chat_id}`))
        const messageObj = JSON.parse(await redisPub.call('JSON.GET', key))//object with vin field
        const [service, ] = key.split(':')

        let vin = null
        if(service === 'sravni' && messageObj?.vin) {
            vin = messageObj.vin
        }
        if(service === 'autoins' && messageObj?.vin) {
            vin = messageObj.vin
        }
        if(service === 'ingos' && messageObj?.identifiers?.length) {
            vin = messageObj.identifiers.find(identifier => identifier.type.name === 'VIN')?.number
        }

        if (vin) {
            const key = `gibdd:${vin}`

            //debounce
            const history = await redisPub.xrevrange('stream:gibdd:resolved', '+', Date.now() - 10000, 'COUNT', '100')
            const idx = history.findIndex(message => {
                const {key: history_key, chat_id: history_chat_id} = flatArrayToObject(message[1])
                return key === history_key && chat_id === history_chat_id
            })
            if (idx === -1) {
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
    }

    //setTimeout(listenForMessages, 100)
    await listenForMessages()
}

listenForMessages()
