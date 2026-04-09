
function extractImages(raw) {
  const images = [];
  
  // 1. Linked image first (more specific)
  let cleanContent = raw.replace(
    /\[!\[(.*?)\]\((.*?)\)\]\((.*?)\)/g,
    (_match, alt, url, link) => {
      const idx = images.length;
      images.push({ url, alt, link });
      return `[image:${idx}]`;
    }
  );

  // 2. Simple image
  cleanContent = cleanContent.replace(
    /!\[(.*?)\]\((.*?)\)/g,
    (_match, alt, url) => {
      const idx = images.length;
      images.push({ url, alt });
      return `[image:${idx}]`;
    }
  );

  return { cleanContent, images };
}

const test1 = "![alt](img.png)";
const test2 = "[alt](img.png)";
const test3 = "[![alt](img.png)](link.com)";
const test4 = "[[alt](img.png)](link.com)";

console.log("Test 1 (Simple Image):", extractImages(test1));
console.log("Test 2 (Regular Link):", extractImages(test2));
console.log("Test 3 (Linked Image):", extractImages(test3));
console.log("Test 4 (Nested Link):", extractImages(test4));
