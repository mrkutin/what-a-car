const PROXY = process.env.PROXY || 'socks5://185.132.177.55:32859' // STATIC!!!

import axios from 'axios'

import * as cheerio from 'cheerio'
import {headersVin, headersVinBody, headersVinBodyChassis} from './headers.mjs'

import {SocksProxyAgent} from 'socks-proxy-agent'
const httpsAgent = new SocksProxyAgent(PROXY)

const getProcessedInsurance = async (processId, cookies) => {
    try {
        const res = await axios.post(`https://dkbm-web.autoins.ru/dkbm-web-1.0/policyInfoData.htm`, `processId=${processId}`, {
            httpsAgent,
            headers: {
                Cookie: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join(';')
            }
        })
        const $ = await cheerio.load(res.data, {
            xml: {
                xmlMode: true,
                withStartIndices: true,
            }
        })
        const texts = $('tr.data-row > td').toArray().map(el => $(el).text())

        let headers
        if(texts[5].includes('VIN') && texts[5].includes('Номер кузова') && texts[5].includes('Номер шасси')){
            headers = headersVinBodyChassis
        } else if (texts[5].includes('VIN') && texts[5].includes('Номер кузова')){
            headers = headersVinBody
        } else {
            headers = headersVin
        }

        const fifthLineArray = texts[5][5].split('\r\n').map(el => el.trim())

        texts.splice(5, 1, fifthLineArray[7], fifthLineArray[12], fifthLineArray[16], fifthLineArray[26])
        const autoins = texts.reduce((acc, text, idx) => {
            acc[headers[idx]] = text
            return acc
        }, {})
        return Promise.resolve(autoins)
    } catch (err) {
        return Promise.reject(err.message)
    }
}

// const res = getProcessedInsurance(1534614576)
// console.log(res)

export {getProcessedInsurance}
