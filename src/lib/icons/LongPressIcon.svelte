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
  <!-- Arc with thicker stroke -->
  <path
    d="M64,76a52,52,0,0,1,104,0"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="24"
  />
  <!-- Hand with original stroke width -->
  <path
    d="M72,224,42.68,174a20,20,0,0,1,34.64-20L96,184V76a20,20,0,0,1,40,0v56a20,20,0,0,1,40,0v16a20,20,0,0,1,40,0v36c0,24-8,40-8,40"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="16"
  />
  <!-- Simple clock inside the hand (centered in the palm area) -->
  <circle
    cx="148"
    cy="200"
    r="34"
    fill="none"
    stroke="currentColor"
    stroke-width="16"
    stroke-linecap="round"
  />
  <!-- Clock hands pointing to 3 o'clock (emphasizing time) -->
  <line
    x1="148"
    y1="200"
    x2="148"
    y2="188"
    stroke="currentColor"
    stroke-width="12"
    stroke-linecap="round"
  />
  <line
    x1="148"
    y1="200"
    x2="160"
    y2="200"
    stroke="currentColor"
    stroke-width="12"
    stroke-linecap="round"
  />
</svg>
