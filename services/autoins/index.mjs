// блочат по IP если было больше 2 новых сессий, поэтому делаем все в одной сессии
const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'
const REDIS_EXPIRATION_SEC = parseInt(process.env.REDIS_EXPIRATION_SEC || (3600 * 24 * 7)) // 1 week
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || 1000)
const ATTEMPTS = parseInt(process.env.ATTEMPTS || 3)
const DEBOUNCE_INTERVAL_MS = parseInt(process.env.DEBOUNCE_INTERVAL_MS || 60000) // 1 min
const DEBOUNCE_COUNT = parseInt(process.env.DEBOUNCE_COUNT || 100)

import Redis from 'ioredis'
const redisPub = new Redis(REDIS_HOST)
const redisSub = new Redis(REDIS_HOST)
try {
    await redisSub.xgroup('CREATE', 'stream:plate:requested', 'autoins', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "autoins" already exists in stream:plate:requested, skipping')
}

import {getInsuranceByPlate} from './getInsuranceByPlate.mjs'

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
    const results = await redisSub.xreadgroup('GROUP', 'autoins', hostId, 'BLOCK', HEARTBEAT_INTERVAL_MS, 'COUNT', 1, 'STREAMS', 'stream:plate:requested', '>')

    await redisPub.set(`heartbeat:autoins:${hostId}`, 1, 'PX', 2 * HEARTBEAT_INTERVAL_MS)
    if(!results?.length){
        return await listenForMessages()
    }

    const flatMessages = results.reduce((acc, result) => {
        return acc.concat(result[1])//messages
    }, [])

    for(const message of flatMessages){
        const messageObj = flatArrayToObject(message[1])
        const {chat_id, plate} = messageObj
        if (plate) {
            const key = `autoins:${plate}`
            const chatSettings = JSON.parse(await redisPub.call('JSON.GET', `chat:${chat_id}`))
            let value = JSON.parse(await redisPub.call('JSON.GET', key))
            if (!value || chatSettings?.cache === false) {
                value = null
                let attempt = 0
                while (!value && attempt < ATTEMPTS) {
                    try {
                        attempt++
                        console.log('Attempt: ', attempt)
                        value = await getInsuranceByPlate(plate)
                    } catch (e) {
                        //retry in case  it's been timeouted or any other problem
                        console.log(e.message)
                        console.log('retrying...')
                    }
                }

                await redisPub.call('JSON.SET', key, '$', JSON.stringify(value))
                await redisPub.expire(key, REDIS_EXPIRATION_SEC)
            }

            await redisPub.xadd('stream:autoins:resolved', '*', 'key', key, 'chat_id', messageObj.chat_id, 'plate', plate)

            if(value?.vin){
                //debounce
                const history = await redisPub.xrevrange('stream:vin:resolved', '+', Date.now() - DEBOUNCE_INTERVAL_MS, 'COUNT', DEBOUNCE_COUNT)
                const idx = history.findIndex(message => {
                    const {vin: history_vin, chat_id: history_chat_id} = flatArrayToObject(message[1])
                    return value.vin === history_vin && chat_id === history_chat_id
                })
                if (idx === -1) {
                    await redisPub.xadd('stream:vin:resolved', '*', 'vin', value.vin, 'chat_id', messageObj.chat_id, 'plate', plate)
                }
            }
        }
    }
    await listenForMessages()
}

listenForMessages()