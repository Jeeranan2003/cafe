import React from 'react';
import { Product } from '../types';
import { Trash2 } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onClick: (product: Product) => void;
  onImageClick: (imgUrl: string) => void;
  onDelete?: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onImageClick, onDelete }) => {
  const isSoldOut = product.status === 'Sold Out';

  return (
    <div 
      className={`group bg-white rounded-xl shadow-md overflow-hidden transform transition duration-300 
        ${isSoldOut ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-2 hover:shadow-2xl hover:border-green-200 cursor-pointer'} 
        border border-transparent h-full flex flex-col relative`}
      onClick={() => !isSoldOut && onClick(product)}
    >
      {onDelete && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(product.id);
          }}
          className="absolute top-2 right-2 z-30 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
          title="ลบสินค้าออกจากระบบ"
        >
          <Trash2 size={16} />
        </button>
      )}

      {isSoldOut && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-20 pointer-events-none">
            <div className="bg-red-600 text-white px-4 py-1 rounded-full font-bold text-sm transform -rotate-12 shadow-lg">
                สินค้าหมด
            </div>
        </div>
      )}

      <div className="relative overflow-hidden h-48">
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className={`w-full h-full object-cover transition-transform duration-500 ${!isSoldOut && 'group-hover:scale-110'}`}
          onClick={(e) => {
            e.stopPropagation();
            if(product.imageUrl) onImageClick(product.imageUrl);
          }}
        />
        {/* Tooltip implementation matching design */}
        {product.description && !isSoldOut && (
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full group-hover:-translate-y-12 transition-transform duration-300 z-10">
             <div className="bg-gray-800 text-white text-xs px-3 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                {product.description}
             </div>
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow justify-between text-center">
        <div>
            <h5 className="text-lg font-semibold text-gray-800 mb-1">{product.name}</h5>
            {product.unit && <p className="text-xs text-gray-500 mb-2">{product.unit}</p>}
        </div>
        <p className="text-xl font-bold text-green-700">{product.price.toLocaleString()} บาท</p>
      </div>
    </div>
  );
};

export default ProductCard;