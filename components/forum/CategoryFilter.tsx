import { useEffect, useState } from 'react';
import { categoryAPI } from '@/lib/api/categoryAPI';
import { CategoryResponseDto } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  categories: CategoryResponseDto[];
  selectedCategoryId?: string;
  onSelectCategory: (categoryId?: string) => void;
  className?: string;
  loading?: boolean;
}

export function CategoryFilter({ categories, selectedCategoryId, onSelectCategory, className, loading }: CategoryFilterProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Topics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Topics</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button
          variant={!selectedCategoryId ? "secondary" : "ghost"}
          className={cn("justify-start", !selectedCategoryId && "bg-secondary")}
          onClick={() => onSelectCategory(undefined)}
        >
          All Topics
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategoryId === category.id ? "secondary" : "ghost"}
            className={cn("justify-start", selectedCategoryId === category.id && "bg-secondary")}
            onClick={() => onSelectCategory(category.id)}
          >
            {category.name}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
