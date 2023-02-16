const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'
const REDIS_EXPIRATION_SEC = parseInt(process.env.REDIS_EXPIRATION_SEC || (3600 * 24 * 7)) // 1 week
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || 1000)

import Redis from 'ioredis'

const redisPub = new Redis(REDIS_HOST)
const redisSub = new Redis(REDIS_HOST)

import {getCaptcha} from './getCaptcha.mjs'
import {getRestrictionsByVin} from './getRestrictionsByVin.mjs'

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

try {
    await redisSub.xgroup('CREATE', 'stream:vin:resolved', 'gibdd:restrictions', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "gibdd:restrictions" already exists in stream:vin:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:captcha:resolved', 'gibdd:restrictions', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "gibdd:restrictions" already exists in stream:captcha:resolved, skipping')
}

const hostId = makeId(7)

async function listenForMessages(/*lastId = '$'*/) {
    const results = await redisSub.xreadgroup(
        'GROUP',
        'gibdd:restrictions',
        hostId,
        'BLOCK',
        HEARTBEAT_INTERVAL_MS,
        'COUNT',
        1,
        'STREAMS',
        'stream:vin:resolved',
        'stream:captcha:resolved',
        '>',
        '>')

    await redisPub.set(`heartbeat:gibdd:restrictions:${hostId}`, 1, 'PX', 2 * HEARTBEAT_INTERVAL_MS)
    if (!results?.length) {
        return await listenForMessages()
    }

    //only captcha resolved
    const flatCaptchaMessages = results
        .filter(([stream]) => ['stream:captcha:resolved'].includes(stream))
        .reduce((acc, result) => {
            return acc.concat(result[1])//messages
        }, [])
    for (const message of flatCaptchaMessages) {
        const {token: captchaToken, solution: captchaWord, vin, chat_id, plate} = flatArrayToObject(message[1])
        const restrictions = await getRestrictionsByVin({captchaToken, captchaWord, vin} )

        const key = `gibdd:restrictions:${vin}`
        await redisPub.call('JSON.SET', key, '$', JSON.stringify(restrictions))
        await redisPub.expire(key, REDIS_EXPIRATION_SEC)

        await redisPub.xadd('stream:gibdd:restrictions:resolved', '*', 'key', key, 'chat_id', chat_id, 'plate', plate)
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
            const key = `gibdd:restrictions:${vin}`
            let value = JSON.parse(await redisPub.call('JSON.GET', key))
            if(value && chatSettings?.cache === true){
                await redisPub.xadd('stream:gibdd:restrictions:resolved', '*', 'key', key, 'chat_id', chat_id, 'plate', plate)
            } else {
                const {captchaToken, base64jpg} = await getCaptcha()
                let captchaKey = `captcha:${captchaToken}`
                await redisPub.set(captchaKey, base64jpg, 'EX', 60)
                await redisPub.xadd('stream:captcha:requested', '*', 'key', captchaKey, 'vin', vin, 'chat_id', chat_id, 'plate', plate)
            }
        }
    }


    await listenForMessages()
}

listenForMessages()

// const res = await getHistoryByVin('XW8AB83T1BK300659')

