const Book = require('../models/Book');
const fs = require('fs')
const sharp = require('sharp')

const resizeImage = (file, bookObject) =>{
    return new Promise((resolve, reject) => {
    const title = bookObject.title.split(' ').join('')
    const type = bookObject.genre.split(' ').join('')
    const author = bookObject.author.split(' ').join('')
    const year = bookObject.year
    const imagePath = `images/resized_${type}_${author}_${title}_${year}_${file.filename}`;

    sharp.cache(false)
    sharp(file.path)
        .resize(210, 260) 
        .toFile(imagePath)
        .then(() => {
            
            fs.unlink(file.path, (err) => {
                if (err) {
                    console.error("Erreur lors de la suppression de l'image originale :", err);
                }
            });
            resolve(imagePath)
        })
        .catch(err => {
            console.log("Erreur lors du redimenssionnement de l'image:", err)
            reject(err);
        });
    });
}

module.exports = resizeImage;