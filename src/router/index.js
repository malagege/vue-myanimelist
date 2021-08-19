import { createRouter, createWebHashHistory } from 'vue-router'

// import json from '../assets/json/animeMenu.json'
import MonthNewAnimePage from '../pages/MonthNewAnimePage.vue'
import AllNewAnimePage from '../pages/AllNewAnimePage.vue'
import animeMenu from'../assets/json/animeMenu.json'

const routes = [
    { path:'/', redirect: animeMenu[0].url},
    { path: '/all/', component: AllNewAnimePage, props: true},
    { path: '/all/:openAnimeList', component: AllNewAnimePage, props: true},
    { path: '/:jsonpath', component: MonthNewAnimePage , props: true},
    // { path: '/.*', redirect: '/'}
];

// json.forEach(data => {
//     routes.push({ path: data.url,component: MyAnimeList})
// });


console.log(routes)

export default createRouter({
    // 4. 內部提供了 history 模式的實現。為了簡單起見，我們在這裡使用 hash 模式。
    history: createWebHashHistory(),
    routes, // `routes: routes` 的縮寫
  })
  
