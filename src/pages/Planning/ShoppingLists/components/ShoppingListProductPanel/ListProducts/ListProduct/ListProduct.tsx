import { Accordion, Button, Col, DropdownMenu, Icon, Row, Textarea } from "@marcin-migdal/m-component-library";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppSelector, useBreakpoint } from "@hooks";
import { ShoppingList } from "@services/ShoppingLists";
import { ShoppingListProduct, useEditShoppingListProductMutation } from "@services/ShoppingListsProduct";
import { selectAuthorization } from "@slices";

import { CategoryDisplay } from "./CategoryDisplay/CategoryDisplay";

import "./styles.scss";

type ListProductProps = {
  product: ShoppingListProduct;
  shoppingList: ShoppingList | undefined;
  handleOpenEditAlert: (product: ShoppingListProduct) => void;
  handleOpenDeleteAlert: (productId: string) => void;
};

export const ListProduct = ({
  product,
  shoppingList,
  handleOpenEditAlert,
  handleOpenDeleteAlert,
}: ListProductProps) => {
  const { authUser } = useAppSelector(selectAuthorization);
  const { t } = useTranslation();
  const [editShoppingListProduct] = useEditShoppingListProductMutation();

  const isMobile = useBreakpoint(`(max-width: 768px)`);

  const [isBusy, setIsBusy] = useState(false);

  const handleCompleteProduct = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    if (!shoppingList) {
      return;
    }

    setIsBusy(true);

    await editShoppingListProduct({
      shoppingListId: shoppingList.id,
      shoppingListProductId: product.id,
      payload: { completed: !product.completed },
    });

    setIsBusy(false);
  };

  return (
    <Accordion.Section sectionId={product.id}>
      <Accordion.Toggle>
        <Row className="w-100-percent">
          <Col sm={3} md={3} lg={3} xl={3}>
            <span className="truncate-text">{product.productDetails.name}</span>
          </Col>
          <Col className="flex justify-end" sm={7} md={8} lg={8} xl={6}>
            <span className="truncate-text">{`${product.amount} ${
              isMobile ? product.unit.shortName : product.unit.name
            }`}</span>
            <CategoryDisplay category={product.category} />
          </Col>
          <Col className="flex justify-end" sm={2} md={1} lg={1} xl={3}>
            <DropdownMenu
              triggerContainerClassName="shopping-list-product-context-menu-trigger"
              options={[
                {
                  label: t("products.editProduct"),
                  onClick: () => handleOpenEditAlert(product),
                  disabled: !authUser?.uid || !shoppingList?.editAccess.includes(authUser.uid),
                },
                {
                  label: t("products.deleteProduct"),
                  onClick: () => handleOpenDeleteAlert(product.id),
                  disabled: shoppingList?.ownerId !== authUser?.uid,
                },
              ]}
              openEvent="click"
              openPosition="auto-bottom"
              positionAlignment="center"
              hideDisabledOptions
              hideOnDisabledOptions
            >
              <Icon icon="ellipsis-vertical" />
            </DropdownMenu>
            <Button
              variant="full"
              icon={product.completed ? "xmark" : "check"}
              disableDefaultMargin
              onClick={handleCompleteProduct}
              disabled={isBusy}
            />
          </Col>
        </Row>
      </Accordion.Toggle>
      <Accordion.Content>
        <Textarea marginBottomType="none" value={product.description} readOnly />
      </Accordion.Content>
    </Accordion.Section>
  );
};
