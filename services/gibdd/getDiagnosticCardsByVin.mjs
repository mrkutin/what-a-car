const PROXY = process.env.PROXY || 'socks5://185.132.177.55:32859'// STATIC!!!

import axios from 'axios'
import UserAgent from 'user-agents'
import {SocksProxyAgent} from 'socks-proxy-agent'
const httpsAgent = new SocksProxyAgent(PROXY)

import {getCaptcha} from './getCaptcha.mjs'
import {solveCaptcha} from './solveCaptcha.mjs'

const getDiagnosticCardsByVin = async (vin) => {
    const userAgentData = new UserAgent().data
    const {captchaToken, base64jpg} = await getCaptcha(httpsAgent, userAgentData)
    const {captchaWord} = await solveCaptcha(base64jpg)
    const res = await axios.post('https://xn--b1afk4ade.xn--90adear.xn--p1ai/proxy/check/auto/diagnostic', {
        vin,
        checkType: 'diagnostic',
        captchaToken,
        captchaWord
    }, {
        httpsAgent,
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

    if(!res?.data?.RequestResult?.diagnosticCards){
        return null
    }

    return res.data.RequestResult.diagnosticCards
}

//const res = await getDiagnosticCardsByVin('XW8AB83T1BK300659')

export {getDiagnosticCardsByVin}