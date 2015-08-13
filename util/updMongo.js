use cats;
db.samples.findAndModify({query:{'artwork.corpusId':'7cf3a4d5-95e2-4499-a412-edac64c7d65c'}, update:{$set:{'artwork.title':"David hyldes efter sejren over Giliat og filistrene",'artwork.dimensions':"126.9 x 159.2 cm"}}});
