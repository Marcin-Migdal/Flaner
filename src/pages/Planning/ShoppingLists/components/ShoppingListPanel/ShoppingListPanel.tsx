import {
  Accordion,
  DropdownMenuOption,
  Textfield,
  TextFieldChangeEvent,
  useAlert,
} from "@marcin-migdal/m-component-library";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ContentWrapper, DeleteAlert, KebabMenu, OnDeleteMutation, UseQueryResult } from "@components";
import { useAppSelector } from "@hooks";
import { ShoppingList, useDeleteShoppingListMutation } from "@services/ShoppingLists";
import { selectAuthorization } from "@slices";

import { AddShoppingListAlert } from "../AddShoppingListAlert/AddShoppingListAlert";
import { EditShoppingListAlert } from "../EditShoppingListAlert/EditShoppingListAlert";

import "./styles.scss";

const filterShoppingList = (shoppingLists: ShoppingList[] | undefined, shoppingListFilter: string): ShoppingList[] => {
  if (!shoppingLists) {
    return [];
  }

  if (shoppingListFilter.trim().length > 0) {
    return shoppingLists.filter((shoppingList) =>
      shoppingList.name.toLocaleLowerCase().includes(shoppingListFilter.toLocaleLowerCase())
    );
  } else {
    return shoppingLists;
  }
};

type ShoppingListPanelProps = {
  shoppingListsQuery: UseQueryResult<ShoppingList[]>;
  onShoppingListSelect: (shoppingListId: string | null) => void;
};

export const ShoppingListPanel = ({ shoppingListsQuery, onShoppingListSelect }: ShoppingListPanelProps) => {
  const { authUser } = useAppSelector(selectAuthorization);
  const { t } = useTranslation();

  const [handleOpenDeleteAlert, deleteAlertProps] = useAlert<string>();
  const [handleOpenEditAlert, editAlertProps] = useAlert<ShoppingList>();

  const [shoppingListsFilter, setShoppingListsFilter] = useState("");

  const [deleteShoppingList] = useDeleteShoppingListMutation();

  const handleFilterChange = (event: TextFieldChangeEvent) => {
    setShoppingListsFilter(event.target.value);
  };

  const handleDelete = (): OnDeleteMutation => {
    if (!deleteAlertProps.data) {
      return;
    }

    return deleteShoppingList(deleteAlertProps.data);
  };

  const getKebabMenuOptions = (shoppingList: ShoppingList): DropdownMenuOption[] => [
    {
      label: t("shoppingLists.editShoppingList"),
      onClick: () => handleOpenEditAlert(shoppingList),
      disabled: !authUser?.uid || !shoppingList.editAccess.includes(authUser.uid),
    },
    {
      label: t("shoppingLists.deleteShoppingList"),
      onClick: () => handleOpenDeleteAlert(shoppingList.id),
      disabled: shoppingList.ownerId !== authUser?.uid,
    },
  ];

  return (
    <>
      <div className="flex g-2-rem">
        <Textfield placeholder={t("shoppingLists.entity")} onChange={handleFilterChange} />
        <AddShoppingListAlert />
      </div>
      <ContentWrapper query={shoppingListsQuery}>
        {({ data: shoppingLists }) => (
          <>
            <Accordion instanceClassName="shopping-list-panel" selectionMode="single" onSelect={onShoppingListSelect}>
              {filterShoppingList(shoppingLists, shoppingListsFilter).map((shoppingList) => (
                <Accordion.Section sectionId={shoppingList.id} key={shoppingList.id}>
                  <Accordion.Toggle className="p-2-rem">
                    <span>{shoppingList.name}</span>
                    <KebabMenu options={getKebabMenuOptions(shoppingList)} />
                  </Accordion.Toggle>
                </Accordion.Section>
              ))}
            </Accordion>
            <DeleteAlert onDelete={handleDelete} {...deleteAlertProps} />
            <EditShoppingListAlert {...editAlertProps} />
          </>
        )}
      </ContentWrapper>
    </>
  );
};
