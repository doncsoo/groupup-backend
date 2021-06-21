## BASE64 STRING TO OBJECT FILE
<hr/>

Convert <b>Base64</b> string to <b>Object File</b>

> example use : 
```
import b64ToFile from 'b64-to-file'

const myBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAgE....'
const fileName = 'myFiles'

const convertedFile = b64ToFile(myBase64, fileName)
```

> convertedFile output :

```
    File {
        name: 'myFile',
        size: 1000203,      // (example)
        mime: 'png',        // (example)
        ...
    }
```

like you got files from input-file html elements