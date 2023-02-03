const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'

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
    const results = await redisSub.xreadgroup('GROUP', 'gibdd', makeId(7), 'BLOCK', '0', 'COUNT', '10', 'STREAMS', 'stream:sravni:resolved', 'stream:autoins:resolved', '>', '>')

    const flatMessages = results.reduce((acc, result) => {
        return acc.concat(result[1])//messages
    }, [])

    for (const message of flatMessages){
        const {key, chat_id} = flatArrayToObject(message[1])
        const messageObj = JSON.parse(await redisPub.call('JSON.GET', key))

        if (messageObj.vin) {
            const key = `gibdd:${messageObj.vin}`

            //cross-check for debounce
            const history = await redisPub.xrevrange('stream:gibdd:resolved', '+', Date.now() - 10000, 'COUNT', '100')
            const idx = history.findIndex(message => {
                const {key: history_key, chat_id: history_chat_id} = flatArrayToObject(message[1])
                return key === history_key && chat_id === history_chat_id
            })
            if(idx === -1){
                console.log('request found!!!')
                let value = JSON.parse(await redisPub.call('JSON.GET', key))
                if (!value) {
                    const history = await getHistoryByVin(messageObj.vin)
                    const accidents = await getAccidentsByVin(messageObj.vin)
                    const wanted = await getWantedByVin(messageObj.vin)
                    const restrictions = await getRestrictionsByVin(messageObj.vin)
                    const diagnosticCards = await getDiagnosticCardsByVin(messageObj.vin)
                    const res = {...history, accidents, wanted, restrictions, diagnosticCards}

                    await redisPub.call('JSON.SET', key, '$', JSON.stringify(res))
                    //todo expire
                }
                await redisPub.xadd('stream:gibdd:resolved', '*', 'key', key, 'chat_id', chat_id)
            }
        }
    }

    //setTimeout(listenForMessages, 100)
    await listenForMessages()
}

listenForMessages()
