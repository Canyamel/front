import React from "react";
import { Input } from "antd";

const { Search } = Input;

interface FilterComponentProps {
  filterText: string;
  onFilter: (value: string) => void;
}

export const FilterComponent: React.FC<FilterComponentProps> = ({
  filterText,
  onFilter,
}) => {
  return (
    <Search
      placeholder="Поиск по имени / номеру полиса"
      value={filterText}
      onChange={(e) => onFilter(e.target.value)}
      onSearch={onFilter}
      className="patients-filter"
      size="middle"
      allowClear
    />
  );
};

