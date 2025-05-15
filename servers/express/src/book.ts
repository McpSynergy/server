export const books = [
  {
    title: "Computing and Technology Ethics",
    author: "Emanuelle Burton, Judy Goldsmith, Nicholas Mattei",
    cover:
      "\thttps://i.pinimg.com/736x/5b/0d/80/5b0d809c4c6a3cfb5f6f87562f98bf16.jpg",
    price: 45.99,
  },
  {
    title:
      "More than a Glitch: Confronting Race, Gender, and Ability Bias in Tech",
    author: "Meredith Broussard",
    cover:
      "https://images-na.ssl-images-amazon.com/images/P/0262547260.01.L.jpg",
    price: 29.99,
  },
  {
    title: "Working with AI: Real Stories of Human-Machine Collaboration",
    author: "Thomas H. Davenport & Steven M. Miller",
    cover:
      "https://images-na.ssl-images-amazon.com/images/P/0262047519.01.L.jpg",
    price: 32.99,
  },
  {
    title:
      "Quantum Supremacy: How the Quantum Computer Revolution Will Change Everything",
    author: "Michio Kaku",
    cover:
      "https://i.pinimg.com/736x/5b/0d/80/5b0d809c4c6a3cfb5f6f87562f98bf16.jpg",
    price: 28.99,
  },
  {
    title: "Business Success with Open Source",
    author: "VM (Vicky) Brasseur",
    cover:
      "https://images-na.ssl-images-amazon.com/images/P/1680509551.01.L.jpg",
    price: 39.99,
  },
  {
    title: "The Internet Con: How to Seize the Means of Computation",
    author: "Cory Doctorow",
    cover:
      "https://images-na.ssl-images-amazon.com/images/P/1804291277.01.L.jpg",
    price: 24.99,
  },
  {
    title:
      "How Infrastructure Works: Inside the Systems That Shape Our World",
    author: "Deb Chachra",
    cover:
      "https://images-na.ssl-images-amazon.com/images/P/0593086430.01.L.jpg",
    price: 27.99,
  },
  {
    title: "Extremely Online: The Untold Story of Fame, Influence, and Power",
    author: "Taylor Lorenz",
    cover:
      "https://images-na.ssl-images-amazon.com/images/P/1982146745.01.L.jpg",
    price: 26.99,
  },
  {
    title: "The Apple II Age: How the Computer Became Personal",
    author: "Laine Nooney",
    cover:
      "https://i.pinimg.com/736x/5b/0d/80/5b0d809c4c6a3cfb5f6f87562f98bf16.jpg",
    price: 35.99,
  },
  {
    title:
      "Fancy Bear Goes Phishing: The Dark History of the Information Age",
    author: "Scott J. Shapiro",
    cover:
      "https://i.pinimg.com/736x/5b/0d/80/5b0d809c4c6a3cfb5f6f87562f98bf16.jpg",
    price: 29.99,
  },
].map((book, index) => ({
  ...book,
  id: book.title + book.author,
}));
