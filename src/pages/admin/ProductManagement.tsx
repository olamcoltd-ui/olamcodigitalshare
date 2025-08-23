import React, { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/ui/file-upload';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Image as ImageIcon,
  FileText,
  Music,
  Video,
  Camera,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  thumbnail_url: string;
  file_url: string;
  file_size_mb: number;
  tags: string[];
  is_active: boolean;
  created_at: string;
  download_count: number;
}

const CATEGORIES = [
  { value: 'ebooks', label: 'E-books', icon: BookOpen },
  { value: 'audio', label: 'Audio Files', icon: Music },
  { value: 'video', label: 'Video Files', icon: Video },
  { value: 'images', label: 'Images/Graphics', icon: Camera },
  { value: 'courses', label: 'Online Courses', icon: FileText },
  { value: 'drama', label: 'Drama', icon: Video },
  { value: 'movies', label: 'Movies', icon: Video },
  { value: 'comedy', label: 'Comedy', icon: Video },
  { value: 'music', label: 'Music', icon: Music },
];

const ProductManagement: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    if (user) {
      fetchProducts();
    }
  }, [user, authLoading, navigate]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('');
    setPrice('');
    setTags('');
    setThumbnailFile(null);
    setProductFile(null);
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setTitle(product.title);
    setDescription(product.description || '');
    setCategory(product.category);
    setPrice(product.price.toString());
    setTags(product.tags?.join(', ') || '');
    setDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const uploadFile = async (file: File, bucket: string, folder: string = '') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async () => {
    try {
      if (!title || !category || !price) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Validate required files for new products
      if (!editingProduct && (!thumbnailFile || !productFile)) {
        toast.error('Please upload both thumbnail and product file');
        return;
      }

      setUploading(true);
      console.log('Starting product submission...');
      
      let thumbnailPath = editingProduct?.thumbnail_url || '';
      let filePath = editingProduct?.file_url || '';

      // Upload thumbnail if provided
      if (thumbnailFile) {
        console.log('Uploading thumbnail...');
        try {
          thumbnailPath = await uploadFile(thumbnailFile, 'product-images', 'thumbnails/');
          console.log('Thumbnail uploaded:', thumbnailPath);
        } catch (uploadError) {
          console.error('Thumbnail upload failed:', uploadError);
          throw new Error('Failed to upload thumbnail image');
        }
      }

      // Upload product file if provided
      if (productFile) {
        console.log('Uploading product file...');
        try {
          filePath = await uploadFile(productFile, 'product-files', 'products/');
          console.log('Product file uploaded:', filePath);
        } catch (uploadError) {
          console.error('Product file upload failed:', uploadError);
          throw new Error('Failed to upload product file');
        }
      }

      const productData = {
        title,
        description,
        category,
        price: parseFloat(price),
        tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
        thumbnail_url: thumbnailPath,
        file_url: filePath,
        file_size_mb: productFile ? Math.round((productFile.size / (1024 * 1024)) * 100) / 100 : editingProduct?.file_size_mb || 0,
        is_active: true
      };

      console.log('Inserting/updating product data:', productData);

      let result;
      if (editingProduct) {
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id)
          .select();
      } else {
        result = await supabase
          .from('products')
          .insert(productData)
          .select();
      }

      console.log('Database result:', result);

      if (result.error) {
        console.error('Database error:', result.error);
        throw result.error;
      }

      toast.success(`Product ${editingProduct ? 'updated' : 'created'} successfully`);
      setDialogOpen(false);
      resetForm();
      fetchProducts();

    } catch (error) {
      console.error('Error saving product:', error);
      const errorMessage = error.message || `Failed to ${editingProduct ? 'update' : 'create'} product`;
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Product Management</h1>
            <p className="text-muted-foreground text-lg">
              Manage your digital products
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="lg" onClick={() => resetForm()}>
                <Plus className="h-5 w-5 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Product Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter product title"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price (₦) *</Label>
                    <Input
                      id="price"
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                </div>
                
                {/* Thumbnail Upload */}
                <div>
                  <Label>Product Thumbnail</Label>
                  <FileUpload
                    type="image"
                    accept="image/*"
                    maxSize={10}
                    placeholder="Drag & drop thumbnail or click to upload"
                    description="Supports: JPG, PNG, GIF (Max 10MB)"
                    currentFile={thumbnailFile}
                    onFileSelect={setThumbnailFile}
                  />
                </div>
                
                {/* Product File Upload */}
                <div>
                  <Label>Product File</Label>
                  <FileUpload
                    accept="*/*"
                    maxSize={3000}
                    placeholder="Drag & drop product file or click to upload"
                    description="Supports: PDF, MP3, MP4, ZIP, and more (Max 3GB)"
                    currentFile={productFile}
                    onFileSelect={setProductFile}
                  />
                </div>
                
                <Button 
                  onClick={handleSubmit} 
                  disabled={uploading}
                  className="w-full"
                  variant="hero"
                >
                  {uploading ? 'Uploading...' : editingProduct ? 'Update Product' : 'Create Product'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Products List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="shadow-elegant">
              <div className="aspect-video bg-muted relative overflow-hidden rounded-t-lg">
                {product.thumbnail_url ? (
                  <img
                    src={`https://wroqliryvssdljfmyjtu.supabase.co/storage/v1/object/public/product-images/${product.thumbnail_url}`}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.title}</h3>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {product.description}
                </p>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-lg font-bold text-success">
                    ₦{product.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground capitalize">
                    {product.category}
                  </span>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDelete(product.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {products.length === 0 && (
          <Card className="shadow-elegant">
            <CardContent className="p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No products yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first digital product
              </p>
              <Button variant="hero" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Product
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ProductManagement;