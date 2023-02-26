// const PROXY = process.env.PROXY || 'socks5://185.132.177.55:32859' // STATIC!!!
const PROXY = process.env.PROXY || 'socks5://190.2.155.30:21551' // DYNAMIC!!!

import querystring from 'node:querystring'
import moment from 'moment'

import puppeteer from 'puppeteer-extra'
import {executablePath} from 'puppeteer'

import StealthPlugin from 'puppeteer-extra-plugin-stealth'

puppeteer.use(StealthPlugin())

import AnonymizePlugin from 'puppeteer-extra-plugin-anonymize-ua'
puppeteer.use(AnonymizePlugin())

const getProcessId = async plate => {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath(),
        defaultViewport: {
            width: 1920, height: 1080
        },
        args: ['--no-sandbox', '--disable-setuid-sandbox', `--proxy-server=${PROXY}`]
        // args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    await page.goto('https://dkbm-web.autoins.ru/dkbm-web-1.0/policyInfo.htm',
        //{waitUntil: 'domcontentloaded'}
        {waitUntil: 'networkidle0'}
    )
    await page.waitForSelector('#tsBlockTab')
    await page.click('#tsBlockTab')

    const responsePromise = new Promise((resolve, reject) => {
        page.on('response', async (response) => {
            if (response.request().url().includes('policyInfo.htm')) {
                const text = await response.text()
                console.log('Parsed text: ', text)
                const json = await response.json()
                if(!json?.processId ){
                    reject(json.errorMessage || 'Error while getting process id')
                }
                resolve(json.processId)
            }
        })
    })

    const encodedPlate = querystring.encode({licensePlate: plate})
    const todayFormatted = moment().format('DD.MM.YYYY')

    await page.evaluate(`getRecaptchaToken("6LcWXc8gAAAAAMpgB0-7TzTELlr8f7T2XiTrexO5", function (token) {
            var formData = getFormDataParams(token);
            var formData = "bsoseries=%D0%A1%D0%A1%D0%A1&bsonumber=&requestDate=${todayFormatted}&vin=&${encodedPlate}&bodyNumber=&chassisNumber=&isBsoRequest=false&&captcha=" + token;
            $.ajax({
                type: "post",
                cache: false,
                url: "policyInfo.htm",
                data: formData,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Accept", "application/json");
                },
                success: function (data) {
                    if (!data.validCaptcha) {
                        LoadingImage.hide();
                        showError(data.errorMessage);
                        return;
                    } else if (data.invalidFields && data.invalidFields.length > 0) {
                        LoadingImage.hide();
                        showErrors(null, data.invalidFields);
                        return;
                    }
                    if (data.errorMessage && data.errorMessage !== "") {
                        LoadingImage.hide();
                        showError(data.errorMessage);
                        return;
                    }
                    $("#processId").val(data.processId);
                    console.log("from evaluate - processId=", data.processId);
                    return;
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    LoadingImage.hide();
                    resetCaptch();
                    if (jqXHR.status === '504') {
                        showError("Превышено время ожидания ответа от сервера очередей сообщений");
                    } else {
                        showError("Произошла непредвиденная ошибка. Попробуйте еще раз.");
                    }
                }
            });
        }, function (err) {
            console.log(err)
        })`
    )

    const processId = await responsePromise
    const cookies = await page.cookies()

    await browser.close()

    return {processId, cookies}
}

export {getProcessId}