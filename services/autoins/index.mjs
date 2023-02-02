// блочат по IP если было больше 2 новых сессий, поэтому делаем все в одной сессии
const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'

import Redis from 'ioredis'
    
const redisPub = new Redis(REDIS_HOST)
const redisSub = new Redis(REDIS_HOST)
try {
    await redisSub.xgroup('CREATE', 'stream:plate_requested', 'autoins', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "autoins" already exists, skipping')
}

import puppeteer from 'puppeteer-extra'
import {executablePath} from 'puppeteer'

import StealthPlugin from 'puppeteer-extra-plugin-stealth'
puppeteer.use(StealthPlugin())


const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath(),
    defaultViewport: {
        width: 1920, height: 1080
    },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
    //args: [ '--proxy-server=http://80.244.229.102:10000' ]
})

const page = await browser.newPage()
await page.goto('https://dkbm-web.autoins.ru/dkbm-web-1.0/policyInfo.htm')

import {getInsuranceByPlate} from './getInsuranceByPlate.mjs'
import {getInsuranceByVin} from './getInsuranceByVin.mjs'

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
    const results = await redisSub.xreadgroup('GROUP', 'autoins', makeId(7), 'BLOCK', '0', 'COUNT', '1', 'STREAMS', 'stream:plate_requested', '>')

    const flatMessages = results.reduce((acc, result) => {
        return acc.concat(result[1])//messages
    }, [])

    const promises = flatMessages.map(async message => {
        const messageObj = flatArrayToObject(message[1])
        if (messageObj.plate) {
            const key = `autoins:${messageObj.plate}`
            let value = JSON.parse(await redisPub.call('JSON.GET', key))
            if (!value) {
                value = await getInsuranceByPlate(page, messageObj.plate)
                await redisPub.call('JSON.SET', key, '$', JSON.stringify(value))
                //todo expire
            }
            await redisPub.xadd('stream:plate_resolved', '*', 'key', key, 'chat_id', messageObj.chat_id)
            //request vin only if not been requested by sravni
            const vinRequestedHistory = await redisPub.xrevrange('stream:vin_requested', '+', Date.now() - 10000, 'COUNT', '100')
            const foundIdx = vinRequestedHistory.findIndex(message => {
                const {vin, chat_id} = flatArrayToObject(message[1])
                return vin === value.vin && chat_id === messageObj.chat_id
            })
            if(foundIdx === -1){
                await redisPub.xadd('stream:vin_requested', '*', 'vin', value.vin, 'chat_id', messageObj.chat_id)
            }
        }
    })
    await Promise.all(promises)

    await listenForMessages(/*messages[messages.length - 1][0]*/)
}

listenForMessages()