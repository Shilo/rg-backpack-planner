<script lang="ts">
  export let size: number | string = 20;
  export let color: string = "currentColor";
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 256 256"
  style="width: {size}px; height: {size}px; color: {color};"
  aria-hidden="true"
  {...$$restProps}
>
  <rect width="256" height="256" fill="none" />
  <path
    d="M58,76a62,62,0,0,1,125,0"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="32"
  />
  <path
    d="M72,224,42.68,174a20,20,0,0,1,34.64-20L96,184V76a20,20,0,0,1,40,0v56a20,20,0,0,1,40,0v16a20,20,0,0,1,40,0v36c0,24-8,40-8,40"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="16"
  />
</svg>
