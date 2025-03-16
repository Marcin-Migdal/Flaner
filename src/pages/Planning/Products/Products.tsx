import { Textfield, TextFieldChangeEvent } from "@marcin-migdal/m-component-library";

import { AddCategoryAlert } from "./components/AddCategoryAlert/AddCategoryAlert";
import { Category, CategoryType } from "./components/Category/Category";

import "./styles.scss";

const categories: CategoryType[] = [
  {
    id: "milk",
    label: "milk",
    icon: "fish",
  },
  {
    id: "fruits",
    label: "fruits",
    icon: "fish",
  },
  {
    id: "vegetables",
    label: "vegetables",
    icon: "fish",
  },
  {
    id: "meat",
    label: "meat",
    icon: "fish",
  },
  {
    id: "fish",
    label: "fish",
    icon: "fish",
  },
  {
    id: "bread",
    label: "bread",
    icon: "fish",
  },
  {
    id: "sweets",
    label: "sweets",
    icon: "fish",
  },
  {
    id: "drinks",
    label: "drinks",
    icon: "fish",
  },
];

// TODO jest na to task, repo configuration i basic ci/cd flanera

// TODO! jak juz tu wrócę to, najpierw trzeba pomyśleć nad BASIC logiką dla kategorii i produktów, potem zrobić endpointy, i dopiero robić komponenty NA PODSTAWIE FIGMY

const Products = () => {
  const handleChange = (event: TextFieldChangeEvent) => {
    const { value } = event.target;
    // TODO! implement category filtering
  };

  return (
    <div className="product-page page p-4-rem">
      <div className="content-container full">
        <div className="flex">
          <Textfield
            classNamesObj={{ container: "category-input-container" }}
            placeholder="Category..."
            onDebounce={handleChange}
            debounceDelay={300}
          />
          <AddCategoryAlert />
        </div>
        <div className="categories-container">
          {categories.map((category) => (
            <Category key={category.id} category={category} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Products;
