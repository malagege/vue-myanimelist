<template>
    <a class="btn" data-bs-toggle="modal" data-bs-target="#exampleModal">
        <IconSetting></IconSetting>
    </a>
    <div class="modal fade bd-example-modal-lg" tabindex="-1" role="dialog" aria-labelledby="myLargeModalLabel" aria-hidden="true" id="exampleModal">
    <div class="modal-dialog modal-lg">
        <div class="modal-content">
            <div class="modal-header">
        <h5 class="modal-title" id="exampleModalToggleLabel">Modal 1</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            Show a second modal and hide this one with the button below.
        </div>
        <div class="modal-footer">
            <button class="btn btn-primary" data-bs-target="#exampleModalToggle2" data-bs-toggle="modal" data-bs-dismiss="modal">Open second modal</button>
        </div>
        </div>
    </div>
    </div>

</template>
<script>
import IconSetting from '~icons/icon-park-outline/setting-two'
export default {
    components:{
        IconSetting
    },
    methods:{
        alertHello(){
            alert('hello');
        }
    }
}

</script>
<style scoped>

</style>