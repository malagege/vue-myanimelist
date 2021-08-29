<template>
    <div class="container">
        <div class="myanimelist">
            <!-- [v-for 循环时直接使用v-model绑定value报错 - 简书](https://www.jianshu.com/p/947b2aa0cd8c) -->
            <MyAnimeListItem 
                v-for="(item,i) in items" 
                v-model:item="items[i]" 
                :key="item.img" 
                @update:item="udata($event)"
                />
        </div>
    </div>

</template>
<script>
import MyAnimeListItem from './MyAnimeListItem.vue'
import axios from 'axios'
import json from '../../src/assets/json/animeMenu.json'

export default{
    props:{
        items: Array
    },
    components: {
        MyAnimeListItem
    },
    data(){
        return {
            // items:[],
            userData:[]
        }
    },
    mounted(){
        console.log(this.jsonpath)
    },
    methods:{
        udata(){
            console.log('test')
            let userSelectedAnime = this.items.filter(item => item.show === true || item.order > '0')
            this.userData = userSelectedAnime.map(item => {
                let{ name, show, order } = item
                return {
                    name,
                    show,
                    order
                }
            })
            this.$emit('changeHash',JSON.stringify(this.userData))
            return this.userData
        }
    },
}
</script>
<style scoped>
.myanimelist{
    display: grid;
    background: rgba(192,192,192);
    grid-template-columns: repeat(4, 1fr);
}

/* [css - Flex-box: Align last row to grid - Stack Overflow](https://stackoverflow.com/questions/18744164/flex-box-align-last-row-to-grid) */
/* .myanimelist::after{
    content: "";
    flex: auto;
} */
</style>