// const PROXY = process.env.PROXY || 'socks5://185.132.177.55:32859'// STATIC!!!

import axios from 'axios'
import UserAgent from 'user-agents'
// import {SocksProxyAgent} from 'socks-proxy-agent'
// const httpsAgent = new SocksProxyAgent(PROXY)

import {ownerTypeMap, autoTypeMap, operationTypeMap} from './dicts.mjs'

const getHistoryByVin = async ({captchaToken, captchaWord, vin}) => {
    console.log(`getHistoryByVin vin: ${vin}, ${new Date()}`)

    const userAgentData = new UserAgent().data

    const res = await axios.post('https://xn--b1afk4ade.xn--90adear.xn--p1ai/proxy/check/auto/history', {
        vin,
        checkType: 'history',
        captchaToken,
        captchaWord
    }, {
        //httpsAgent,
        headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7',
            'Cache-Control': 'no-api-gateway',
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Host': 'xn--b1afk4ade.xn--90adear.xn--p1ai',
            'Origin': 'https://xn--90adear.xn--p1ai',
            'Pragma': 'no-api-gateway',
            'Referer': 'https://xn--90adear.xn--p1ai/',
            //'sec-ch-ua': '"Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
            'sec-ch-ua-mobile': `?${userAgentData.deviceCategory === 'desktop' ? '0' : '1'}`,
            'sec-ch-ua-platform': userAgentData.platform,
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
            'User-Agent': userAgentData.userAgent
        }
    })

    console.log(`getHistoryByVin res.data: ${JSON.stringify(res.data)}, ${new Date()}`)

    if (!res?.data?.RequestResult) {
        return null
    }

    const {ownershipPeriods: {ownershipPeriod: ownershipPeriods}, vehicle} = res.data.RequestResult
    vehicle.type = autoTypeMap[vehicle.type] || vehicle.type
    return {
        ownershipPeriods: ownershipPeriods.map(({from, lastOperation, simplePersonType, to}) => ({
            from,
            to,
            operation: operationTypeMap[lastOperation] || lastOperation,
            ownerType: ownerTypeMap[simplePersonType] || simplePersonType
        })),
        vehicle
    }
}

// const res = await getHistoryByVin('XW8AB83T1BK300659')

export {getHistoryByVin}