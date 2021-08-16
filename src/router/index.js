import { createRouter, createWebHashHistory } from 'vue-router'

// import json from '../assets/json/animeMenu.json'
import MyAnimeList from '../components/MyAnimeList.vue'
import json from'../assets/json/animeMenu.json'

const routes = [
    { path: '/', component: MyAnimeList,props:{jsonpath: json[0].url} },
    { path: '/:jsonpath', component: MyAnimeList , props: true},
    { path: '/.*', redirect: '/'}
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
  
