
import {  saveJSON } from './utils.mjs'
import axios from 'axios'
import * as cheerio from 'cheerio';
import OpenCC from 'opencc-js';

const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

async function fetchRemoteData (path) {
    const { data, status } = await axios.get(path)
    .catch((e) => {
        console.error(e)
        return false
    })
    if(status !== 200){
        return false;
    }
    return data
}

export default async function generateAnimeList (animeMenu) {

    let okGen = await generateAnimeListForACGNTaiwanUrl(animeMenu)
    if( okGen === false){
        return await generateAnimeListForYucWiki(animeMenu)
    }
}

async function generateAnimeListForYucWiki(animeMenu){
    let data = ''
    data = await fetchRemoteData(animeMenu.YuiWikiUrl)

    const $ = cheerio.load(data)
    let res = [];

    res = Array($('table').length).fill({
        "name": "",
        "date": "",
        "time": "",
        "carrier": "",
        "season": 1,
        "originalName": "",
        "img": "",
        "official": "",
        "description": "",
        "staff":"",
    })
    res = JSON.parse(JSON.stringify(res))

    $('table').each((i,el)=>{
        res[i].img = $(el)?.parent()?.prev()?.find('img')?.attr('src') || 'https://via.placeholder.com/150x225'
        res[i].name = converter($(el).find('table tr:first-child td:first-child p:nth-child(1)')?.text()?.replace(/第(.+)期/, ''))
        res[i].season = parseInt($(el).find('table tr:first-child td:first-child p:nth-child(1)').text().match(/第(.+)期/) ? $(el).find('table tr:first-child td:first-child p:nth-child(1)').text().match(/第(.+)期/)[1] : 1)
        res[i].originalName = $(el).find('table tr:first-child td:first-child p:nth-child(2)').text().replace(/第(.+)期/, '')
        res[i].official = $(el).find('table .link_a')?.attr('href')
        res[i].carrier = { a: "Original", b: "Comic", c: "Novel", d: "Game" }[$(el).find(`td[class^="type"]:nth-child(even)`).attr('class')?.replace(`type_`, '')] || "Original"
        res[i].staff = converter($(el).find('.staff')?.text())
    })


    saveJSON(animeMenu.name, res)
    return res
}

async function generateAnimeListForACGNTaiwanUrl(animeMenu){
    let data = ''
    data = await fetchRemoteData(animeMenu.ACGNTaiwanUrl)

    if( data === false){
        return false;
    }
    
    return saveJSON(animeMenu.name, data)
}