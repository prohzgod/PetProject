// Product catalog. Shared by the storefront (display) and the server (pricing).
// The server always re-prices the cart from this list: never trust prices sent
// by the browser.

export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number; // VND, integer
  emoji: string;
  tint: string; // tailwind background class for the product tile
};

export const PRODUCTS: Product[] = [
  {
    id: "salmon-kibble",
    name: "Wild Salmon Kibble 2kg",
    category: "Food",
    description: "Grain-free dry food with omega-3 for a shiny coat.",
    price: 389000,
    emoji: "🐟",
    tint: "bg-sky-100",
  },
  {
    id: "chicken-treats",
    name: "Chicken Jerky Treats",
    category: "Treats",
    description: "Single-ingredient air-dried chicken. 150g pouch.",
    price: 119000,
    emoji: "🍗",
    tint: "bg-amber-100",
  },
  {
    id: "rope-toy",
    name: "Cotton Rope Tug Toy",
    category: "Toys",
    description: "Hand-knotted cotton rope for tugging and dental care.",
    price: 89000,
    emoji: "🪢",
    tint: "bg-rose-100",
  },
  {
    id: "cat-tower",
    name: "Cozy Cat Tower",
    category: "Furniture",
    description: "Three levels of sisal scratching posts and a plush nook.",
    price: 1290000,
    emoji: "🐈",
    tint: "bg-violet-100",
  },
  {
    id: "leash-set",
    name: "Reflective Leash & Collar",
    category: "Accessories",
    description: "Night-visible nylon set with a quick-release buckle.",
    price: 249000,
    emoji: "🦮",
    tint: "bg-emerald-100",
  },
  {
    id: "pet-bed",
    name: "Orthopedic Pet Bed",
    category: "Furniture",
    description: "Memory foam bed with a washable cover. Size M.",
    price: 790000,
    emoji: "🛏️",
    tint: "bg-orange-100",
  },
  {
    id: "shampoo",
    name: "Oatmeal Pet Shampoo",
    category: "Grooming",
    description: "Soothing, soap-free formula for sensitive skin. 500ml.",
    price: 159000,
    emoji: "🧴",
    tint: "bg-teal-100",
  },
  {
    id: "sample-treat",
    name: "Treat Sample (test item)",
    category: "Treats",
    description: "A tiny 2.000đ item, handy for testing with real money.",
    price: 2000,
    emoji: "🦴",
    tint: "bg-stone-200",
  },
];

export const FREE_SHIPPING_THRESHOLD = 500000;
export const SHIPPING_FEE = 30000;

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function shippingFor(subtotal: number): number {
  // The 2.000đ sample ships free so a full end-to-end test stays cheap.
  if (subtotal === 0 || subtotal < 10000) return 0;
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}
