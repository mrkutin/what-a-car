const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'
const REDIS_EXPIRATION_SEC = parseInt(process.env.REDIS_EXPIRATION_SEC || (3600 * 24 * 7)) // 1 week
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || 1000)
const DEBOUNCE_INTERVAL_MS = parseInt(process.env.DEBOUNCE_INTERVAL_MS || 60000) // 1 min
const DEBOUNCE_COUNT = parseInt(process.env.DEBOUNCE_COUNT || 100)

import Redis from 'ioredis'

const redisPub = new Redis(REDIS_HOST)
const redisSub = new Redis(REDIS_HOST)

import {getCaptcha} from './getCaptcha.mjs'
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

//vin needs to be processed by each host of each service, so the group name is unique
try {
    await redisSub.xgroup('CREATE', 'stream:sts:resolved', 'gibdd:fines', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "gibdd:fines" already exists in stream:sts:resolved, skipping')
}
//captcha needs to be processed by one host of one service, so the group name is common
try {
    await redisSub.xgroup('CREATE', 'stream:captcha:sts:resolved', 'gibdd', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "gibdd" already exists in stream:captcha:sts:resolved, skipping')
}

const hostId = makeId(7)

async function listenForMessages(/*lastId = '$'*/) {
    await redisPub.set(`heartbeat:gibdd:fines:${hostId}`, 1, 'PX', 2 * HEARTBEAT_INTERVAL_MS)

    const stsResults = await redisSub.xreadgroup('GROUP', 'gibdd:fines', hostId, 'BLOCK', HEARTBEAT_INTERVAL_MS, 'COUNT', 1, 'STREAMS', 'stream:sts:resolved', '>')
    const captchaStsResults = await redisSub.xreadgroup('GROUP', 'gibdd', hostId, 'BLOCK', HEARTBEAT_INTERVAL_MS, 'COUNT', 1, 'STREAMS', 'stream:captcha:sts:resolved', '>')

    if(stsResults?.length){
        //only messages with STS
        const flatMessagesWithVin = stsResults
            .reduce((acc, result) => {
                return acc.concat(result[1])//messages
            }, [])
        for (const message of flatMessagesWithVin) {
            const {sts, chat_id, plate} = flatArrayToObject(message[1])
            const chatSettings = JSON.parse(await redisPub.call('JSON.GET', `chat:${chat_id}`))

            if (plate && sts) {
                const key = `gibdd:fines:${plate}:${sts}`
                //debounce
                const history = await redisPub.xrevrange('stream:gibdd:fines:resolved', '+', Date.now() - DEBOUNCE_INTERVAL_MS, 'COUNT', DEBOUNCE_COUNT)
                const idx = history.findIndex(message => {
                    const {key: history_key, chat_id: history_chat_id} = flatArrayToObject(message[1])
                    console.log()
                    return key === history_key && chat_id === history_chat_id
                })
                if (idx === -1) {
                    let value = JSON.parse(await redisPub.call('JSON.GET', key))
                    if(value && chatSettings?.cache === true){
                        await redisPub.xadd('stream:gibdd:fines:resolved', '*', 'key', key, 'chat_id', chat_id, 'plate', plate)
                    } else {
                        const {captchaToken, base64jpg} = await getCaptcha()
                        let captchaKey = `captcha:${captchaToken}`
                        await redisPub.set(captchaKey, base64jpg, 'EX', 60)
                        await redisPub.xadd('stream:captcha:sts:requested', '*', 'key', captchaKey, 'token', captchaToken, 'sts', sts, 'chat_id', chat_id, 'plate', plate)
                    }
                }
            }
        }
    }

    if(captchaStsResults?.length){
        //only sts captcha resolved
        const flatCaptchaMessages = captchaStsResults
            .reduce((acc, result) => {
                return acc.concat(result[1])//messages
            }, [])
        for (const message of flatCaptchaMessages) {
            const {token: captchaToken, solution: captchaWord, sts, chat_id, plate} = flatArrayToObject(message[1])
            const fines = await getFinesByPlateAndSts({captchaToken, captchaWord, plate, sts} )

            const key = `gibdd:fines:${plate}:${sts}`

            await redisPub.call('JSON.SET', key, '$', JSON.stringify(fines))
            await redisPub.expire(key, REDIS_EXPIRATION_SEC)

            await redisPub.xadd('stream:gibdd:fines:resolved', '*', 'key', key, 'chat_id', chat_id, 'plate', plate)
        }
    }

    await listenForMessages()
}

listenForMessages()