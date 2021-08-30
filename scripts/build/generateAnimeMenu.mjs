
import {  saveJSON } from './utils.mjs'
import axios from 'axios'
import * as cheerio from 'cheerio';

async function fetchRemoteData () {
    const { data } = await axios.get('https://yuc.wiki/')
    .catch((e) => {
        console.log(e)
        return { data: '' }
    })
    return data
}

export default async function generateAnimeMenu () {
    let data = ''
    data = await fetchRemoteData()

    const $ = cheerio.load(data)
    let json = [];
    $('.links-of-blogroll-item a').each((i,el)=>{
        let url = $(el).attr('href')
        let name = $(el).text();
        if (name.indexOf('新番') <= 0){
            return 
        } 
        const regex = /(\d+年\d+月新番)/gm;
        let m = regex.exec(name)
        name = m[0]
        let item = {
            name,
            url,
        }

        json.push(item)
    });
    // console.log(json)
    saveJSON('animeMenu', json)
    return json
}