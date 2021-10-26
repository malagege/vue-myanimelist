<template>
<!-- 參考: [Creating a Vue.js File Reader Component Using the FileReader API | DigitalOcean](https://www.digitalocean.com/community/tutorials/vuejs-file-reader-component) -->
  <div>
    <label class="text-reader">
        <input type="file" @change="loadTextFromFile">
        <slot></slot>
    </label>
  </div>
</template>

<script>
export default {
  methods: {
    loadTextFromFile(ev) {
      const file = ev.target.files[0];
      const reader = new FileReader();

      reader.onload = e => this.$emit("load", e.target.result);
      reader.readAsText(file);
    }
  }
};
</script>
<style scoped>
.text-reader input[type="file"]{
    display: none;
}
</style>