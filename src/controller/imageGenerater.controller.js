import axios from "axios";
import { storage, params } from "@ampt/sdk";
import { data } from "@ampt/data";
import { render } from "@ampt/ai";

const imageStorage = storage("images");

// middleware controller function to handle generate image api's
const generateImage = async (req, res) => {
  try {
    const prompt = req.body.prompt.replace(/(\r\n|\n|\r)/gm, "");
    const response = await render(prompt);

    // get count of images from the DB to determine next id
    let imageCount = await data.get("imageIdCount");
    if (!imageCount) {
      await data.set("imageIdCount", 0);
      imageCount = 0;
    }
    const newImageId = await data.add("imageIdCount", 1);

    // get image as a buffer
    const imageBuffer = await response.arrayBuffer();

    // store generated image in S3
    await imageStorage.write(`/generatedImage/${newImageId}`, imageBuffer, {
      type: "image/jpeg",
    });

    // get saved images download url
    const imageUrl = await imageStorage.getDownloadUrl(
      `/generatedImage/${newImageId}`
    );

    // get generted image temp store
    let tempImageList = await data.get("temporaryImageStore");
    if (!tempImageList) {
      tempImageList = [];
    }
    // add imageId to tempImageList and persist to DB
    tempImageList.push({ imageId: newImageId, prompt: req.body.prompt });
    await data.set("temporaryImageStore", tempImageList);

    // send image id and image url as success response
    res.send({ success: true, data: { id: newImageId, imageUrl: imageUrl } });
  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
};

export default { generateImage };
