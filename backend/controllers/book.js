const Book = require('../models/Book');
const fs = require('fs')
const resizeImage = require('../util/resizeImage')


exports.createBook = (req, res, next) => {
    const bookObject = JSON.parse(req.body.book);
    delete bookObject._id;
    delete bookObject._userId;

    resizeImage(req.file, bookObject)
        .then((resizeImagePath) => {

            const book = new Book({
                ...bookObject,
                userId: req.auth.userId,
                imageUrl: `${req.protocol}://${req.get('host')}/${resizeImagePath}`,
                averageRating: bookObject.ratings[0].grade
            });

            return book.save();
        })
        .then(() => res.status(201).json({ message: 'Livre enregistré !' }))
        .catch(error => res.status(400).json({ error }));
};

exports.modifyBook = (req, res, next) => {
    const bookObject = req.file ? { ...JSON.parse(req.body.book) } : { ...req.body };
    delete bookObject._userId;

    Book.findOne({ _id: req.params.id })
        .then((book) => {
            if (book.userId != req.auth.userId) {
                return res.status(401).json({ message: 'Non autorisé' });
            }

            if (req.file) {
                const oldImagePath = book.imageUrl ? book.imageUrl.split(`${req.protocol}://${req.get('host')}/`)[1] : null;

                resizeImage(req.file, bookObject)
                    .then((resizeImagePath) => {
                        if (oldImagePath) {
                            fs.unlink(oldImagePath, (err) => {
                                if (err) {
                                    console.error("Erreur lors de la suppression de l'ancienne image :", err);
                                }
                            });
                        }

                        bookObject.imageUrl = `${req.protocol}://${req.get('host')}/${resizeImagePath}`;

                        return Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id });
                    })
                    .then(() => res.status(200).json({ message: 'Livre modifié avec succès' }))
                    .catch((error) => res.status(400).json({ error }));
            } else {
                return Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id })
                    .then(() => res.status(200).json({ message: 'Livre modifié avec succès' }))
                    .catch((error) => res.status(400).json({ error }));
            }
        })
        .catch((error) => res.status(400).json({ error }));
};

exports.deleteBook = (req, res, next) => {
    Book.findOne({_id: req.params.id})
        .then(book => {
            if(book.userId != req.auth.userId) {
                res.status(401).json({message: 'Non autorisé'})
            } else {
                const filename = book.imageUrl.split('/images/')[1];
                fs.unlink(`images/${filename}`, () => {
                    Book.deleteOne({_id: req.params.id})
                        .then(() => res.status(200).json({message: 'Livre supprimé'}))
                        .catch(error => res.status(401).json({error}))
                });
            }
        })
        .catch(error => {res.status(500).json({error})});
}

exports.getOneBook = (req, res, next) => {
    Book.findOne({_id: req.params.id})
        .then(book => res.status(200).json(book))
        .catch(error => res.status(404).json({error}));
};

exports.getAllBooks = (req, res, next) => {
    Book.find()
     .then(books => {
        console.log("Livres trouvés:", books);
        res.status(200).json(books)})
     .catch(error => res.status(400).json({error}));
 };

exports.top3 = (req, res, next) => {
    Book.find().sort({averageRating: -1}).limit(3)
        .then(books => {
            console.log(books);
            res.status(200).json(books)
        })
        .catch(error => res.status(400).json({ error }));
}

exports.ratingBook = (req, res, next) => {
    if (req.body.rating >= 0 && req.body.rating <= 5) {
        const bookRate = { ...req.body, grade: req.body.rating};
        delete bookRate._id;

        Book.findOne ({_id: req.params.id})
            .then(book => {
                const bookRatings = book.ratings
                const allUserId = bookRatings.map(rating => rating.userId)
                if (allUserId.includes(req.auth.userId)) {
                    res.status(400).json({message: 'Vous avez déjà noté ce livre !'})
                } else {
                    bookRatings.push(bookRate);
                    const grades = bookRatings.map(rating => rating.grade)
                    const averageGrades = (grades.reduce((sum, grade) => sum + grade, 0) / grades.length).toFixed(1);
                    book.averageRating = averageGrades
                    Book.updateOne({_id: req.params.id}, { ratings: bookRatings, averageRating: averageGrades, _id: req.params.id })
                        .then(() => {return Book.findOne({_id: req.params.id})})
                        .then(updateBook => {
                            res.status(200).json(updateBook)
                        })
                        .catch(error => res.status(401).json({error}));
                }
            })
            .catch(error => res.status(404).json({error}));

    } else {
        res.status(400).json({message: 'La note dois être comprise entre 0 et 5.'});
    }
}

