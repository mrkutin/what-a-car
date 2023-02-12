import axios from 'axios'
import UserAgent from 'user-agents'
import {getCaptcha} from './getCaptcha.mjs'
import {solveCaptcha} from './solveCaptcha.mjs'

const operations = [
    '',
    'Запрет на регистрационные действия',
    'Запрет на снятие с учета',
    'Запрет на регистрационные действия и прохождение ГТО',
    'Утилизация (для транспорта не старше 5 лет)',
    'Аннулирование'
]

const organizations = [
        'не предусмотренный код',
        'Судебные органы',
        'Судебный пристав',
        'Таможенные органы',
        'Органы социальной защиты',
        'Нотариус',
        'ОВД или иные правоохр. органы',
        'ОВД или иные правоохр. органы (прочие)'
    ]

const getRestrictionsByVin = async vin => {
    const makeRequest = async () => {
        const {captchaToken, base64jpg} = await getCaptcha()
        const {captchaWord} = await solveCaptcha(base64jpg)
        const userAgentData = new UserAgent().data
        const res = await axios.post('https://xn--b1afk4ade.xn--90adear.xn--p1ai/proxy/check/auto/restrict', {
            vin,
            checkType: 'restricted',
            captchaToken,
            captchaWord
        }, {
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

        if(!res?.data?.RequestResult?.records){
            return []
        }

        const restrictions = res.data.RequestResult.records
        for (let i = 0; i<restrictions.length; i++){
            //map operations
            let ogrcod = parseInt(restrictions[i].ogrkod)
            if(isNaN(ogrcod) || ogrcod >= operations.length || ogrcod < 0){
                ogrcod = 0
            }
            restrictions[i].ogrkod = operations[ogrcod]

            //map organizations
            let divtype = parseInt(restrictions[i].divtype)
            if(isNaN(divtype) || divtype >= organizations.length || divtype < 0){
                divtype = 0
            }
            restrictions[i].divtype = organizations[divtype]

        }

        return restrictions
    }
    let res
    try {
        res = await makeRequest()
        if(!res){
            res = await makeRequest()
        }
    } catch (e) {
        console.log(e.message)
    }
    return res
}

export {getRestrictionsByVin}