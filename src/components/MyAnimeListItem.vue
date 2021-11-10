<template>
    <div class="myAnimeListItem"
        @click="toggle($event)" 
        @contextmenu="orderItem($event)" 
        :style="{order: item.order}"
        :data-order="item.order"
    >
        <div class="cancel" :class="{hidden: item.show}"></div>
        <div class="myAnimeListItem__name">{{item.name}}</div>
        <div class="flex">
            <img class="myAnimeListItem__animeImg" :src="item.img" referrerpolicy="no-referrer" >
            <pre class="myAnimeListItem__staff">
                {{item.staff||item.description}}
            </pre>
        </div>
    </div>
</template>
<script>

export default {
    props:{
        item: Object
    },
    emits: ['update:item'],
    methods:{
        toggle(ent){
            // console.log(ent)
            this.item.show = !!!this.item.show
            this.$emit('update:item', this.item)
        },
        orderItem(event){
            this.item.order = prompt(`請輸入「${this.item.name}」動畫名次`)
            event.preventDefault(); 
            this.$emit('update:item', this.item)
        }
    }
}
</script>
<style scoped>

.myAnimeListItem .cancel.hidden{
    /* display: none; */
    bottom: 100%
}
.flex{
    display: flex;
}

.myAnimeListItem{
    min-width: 275px;
    height: 250px;
    position: relative;
    cursor: pointer;
    order: 999;
}

.myAnimeListItem::before{
  content: attr(data-order);
  color:tomato;
  background:rgba(0, 0, 0, .7);
  font-weight: bold;
  font-size: 3rem;
  line-height: 1;
  position: absolute;
  right: 20px;
  bottom: 10px;
}

.myAnimeListItem .cancel{
    top:0px;
    left:0px;
    right: 0px;
    bottom: 0px;
    transition: bottom .5s ;
    position: absolute;
    background: black;
    opacity: 0.45;
    pointer-events: none;
}

.myAnimeListItem__name{
    background: black;
    color: white;
    padding-top: 3%;
    height: 50px;
    text-align: center;
    font-size: 1.4em;
}

.myAnimeListItem__animeImg{
    flex: 1;
    width: 50%;
    height: 200px;
    object-fit: cover;
}

.myAnimeListItem__animeImg img{
    width: 100%;
}

.myAnimeListItem__staff{
    flex: 1;
    width: 50%;
    background-color: rgb(192,192,192);
    white-space: pre-line;
    padding: 5px 5px 5px 5px;
    word-break: break-all;
    color: black;
    font-size: 13px;
    overflow: auto;
    height: 200px;
    overflow: hidden;
}

* {
    box-sizing: border-box;
}
</style>